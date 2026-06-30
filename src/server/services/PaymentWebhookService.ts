import {
  classifyPayMongoWebhookEventType,
  parsePayMongoWebhookEvent,
  type PayMongoWebhookProcessingStatus,
} from "@/domain/payments/paymongo-webhook";
import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import {
  verifyPayMongoWebhookSignature,
  type PayMongoWebhookSignatureVerificationResult,
} from "@/lib/paymongo/PayMongoWebhookVerifier";
import type {
  ClaimPaymentWebhookEventInput,
  ClaimPaymentWebhookEventResult,
  ProcessPaidCheckoutSessionInput,
  ProcessPaidCheckoutSessionResult,
} from "@/server/repositories/PaymentWebhookRepository";
import type { PaymentReconciliationResult } from "@/server/services/PaymentReconciliationService";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PaymentWebhookRepositoryLike = {
  claimEvent(
    input: ClaimPaymentWebhookEventInput
  ): Promise<ClaimPaymentWebhookEventResult>;
  processPaidCheckoutSession(
    input: ProcessPaidCheckoutSessionInput
  ): Promise<ProcessPaidCheckoutSessionResult>;
};

export type PaymentWebhookServiceInput = {
  now?: string;
  nowMs?: number;
  rawBody: string;
  requestId: string;
  signatureHeader?: string | null;
  webhookSecret?: string | null;
};

export type PaymentWebhookServiceResult = {
  event: {
    eventType: string;
    idempotent: boolean;
    providerEventId: string;
    status: PayMongoWebhookProcessingStatus;
  };
  payment?: {
    paymentId: string;
    status: "PAYMENT_PAID";
  };
  order?: {
    emailStatus: PaymentReconciliationResult["email"]["status"];
    fulfillmentStatus: string;
    orderId: string;
    orderNumber: string;
    totalCentavos: number;
  };
};

export type PaymentReconciliationServiceLike = {
  confirmPaidPayment(input: {
    now?: string;
    paymentId: string;
    requestId: string;
  }): Promise<AppResult<PaymentReconciliationResult>>;
};

export type PaymentWebhookServiceOptions = {
  auditPublisher?: AuditEventPublisher;
  operationalLogger?: OperationalLogger;
  reconciliationService?: PaymentReconciliationServiceLike;
  repository: PaymentWebhookRepositoryLike;
};

function safeActor() {
  return {
    type: "system" as const,
    role: "SYSTEM" as const,
    safeIdentifier: "paymongo-webhook",
  };
}

function errorForVerification(
  verification: Extract<
    PayMongoWebhookSignatureVerificationResult,
    { ok: false }
  >
) {
  return new GeneralError({ reason: verification.reason }, verification.code);
}

export class PaymentWebhookService {
  private readonly auditPublisher: AuditEventPublisher;
  private readonly operationalLogger: OperationalLogger;
  private readonly reconciliationService?: PaymentReconciliationServiceLike;
  private readonly repository: PaymentWebhookRepositoryLike;

  constructor(options: PaymentWebhookServiceOptions) {
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.reconciliationService = options.reconciliationService;
    this.repository = options.repository;
  }

  async processPayMongoWebhook(
    input: PaymentWebhookServiceInput
  ): Promise<AppResult<PaymentWebhookServiceResult>> {
    const now = input.now ?? new Date().toISOString();
    const verification = await verifyPayMongoWebhookSignature({
      nowMs: input.nowMs,
      rawBody: input.rawBody,
      signatureHeader: input.signatureHeader,
      webhookSecret: input.webhookSecret,
    });

    if (!verification.ok) {
      this.recordOperationalRejection({
        requestId: input.requestId,
        reason: verification.reason,
        status: verification.code,
      });

      return Result.error(errorForVerification(verification));
    }

    const parsed = parsePayMongoWebhookEvent(input.rawBody);

    if (!parsed.ok) {
      await this.publishRejectedAudit({
        eventType: "unknown",
        providerEventId: "unknown",
        requestId: input.requestId,
        reason: parsed.reason,
        status: "FAILED",
      });

      return Result.error(
        new GeneralError({ reason: parsed.reason }, "VALIDATION_FAILED")
      );
    }

    const eventDecision = classifyPayMongoWebhookEventType(
      parsed.event.eventType
    );
    const claim = await this.repository.claimEvent({
      eventType: parsed.event.eventType,
      initialStatus:
        eventDecision.status === "supported" ? "RECEIVED" : "IGNORED",
      now,
      payloadHash: verification.payloadHash,
      providerCheckoutSessionId: parsed.event.providerCheckoutSessionId,
      providerEventId: parsed.event.providerEventId,
      providerPaymentId: parsed.event.providerPaymentId,
      providerPaymentIntentId: parsed.event.providerPaymentIntentId,
      requestId: input.requestId,
    });

    if (claim.decision === "conflict") {
      await this.publishRejectedAudit({
        eventType: claim.event.eventType,
        providerCheckoutSessionId: claim.event.providerCheckoutSessionId,
        providerEventId: claim.event.providerEventId,
        providerPaymentId: claim.event.providerPaymentId,
        requestId: input.requestId,
        reason: "idempotency_conflict",
        status: "CONFLICT",
      });

      return Result.error(new GeneralError({}, "IDEMPOTENCY_CONFLICT"));
    }

    if (claim.decision === "duplicate") {
      if (
        claim.event.processingStatus === "RECEIVED" &&
        eventDecision.status === "supported" &&
        claim.event.providerCheckoutSessionId
      ) {
        const processed = await this.repository.processPaidCheckoutSession({
          eventId: claim.event.id,
          now,
          providerCheckoutSessionId: claim.event.providerCheckoutSessionId,
          requestId: input.requestId,
        });

        return this.resultForProcessedEvent({
          eventType: claim.event.eventType,
          processed,
          providerCheckoutSessionId: claim.event.providerCheckoutSessionId,
          providerEventId: claim.event.providerEventId,
          providerPaymentId: claim.event.providerPaymentId,
          requestId: input.requestId,
        });
      }

      const reconciliation =
        claim.event.processingStatus === "PROCESSED" &&
        claim.event.relatedPaymentId
          ? await this.confirmPaidPayment({
              now,
              paymentId: claim.event.relatedPaymentId,
              requestId: input.requestId,
            })
          : null;

      if (reconciliation?.error) {
        return Result.error(reconciliation.error);
      }

      this.recordOperationalProcessed({
        eventType: claim.event.eventType,
        idempotent: true,
        providerCheckoutSessionId: claim.event.providerCheckoutSessionId,
        providerEventId: claim.event.providerEventId,
        providerPaymentId: claim.event.providerPaymentId,
        requestId: input.requestId,
        status: claim.event.processingStatus,
      });

      return Result.okay({
        event: {
          eventType: claim.event.eventType,
          idempotent: true,
          providerEventId: claim.event.providerEventId,
          status: claim.event.processingStatus,
        },
        ...(claim.event.processingStatus === "PROCESSED" &&
        claim.event.relatedPaymentId
          ? {
              payment: {
                paymentId: claim.event.relatedPaymentId,
                status: "PAYMENT_PAID" as const,
              },
            }
          : {}),
        ...(reconciliation?.content
          ? {
              order: {
                emailStatus: reconciliation.content.email.status,
                fulfillmentStatus:
                  reconciliation.content.order.fulfillmentStatus,
                orderId: reconciliation.content.order.orderId,
                orderNumber: reconciliation.content.order.orderNumber,
                totalCentavos: reconciliation.content.order.totalCentavos,
              },
            }
          : {}),
      });
    }

    if (eventDecision.status === "unsupported") {
      await this.publishProcessedAudit({
        eventType: claim.event.eventType,
        providerCheckoutSessionId: claim.event.providerCheckoutSessionId,
        providerEventId: claim.event.providerEventId,
        providerPaymentId: claim.event.providerPaymentId,
        requestId: input.requestId,
        status: "IGNORED",
      });

      return Result.okay({
        event: {
          eventType: claim.event.eventType,
          idempotent: false,
          providerEventId: claim.event.providerEventId,
          status: "IGNORED",
        },
      });
    }

    if (!parsed.event.providerCheckoutSessionId) {
      await this.publishRejectedAudit({
        eventType: claim.event.eventType,
        providerEventId: claim.event.providerEventId,
        providerPaymentId: claim.event.providerPaymentId,
        requestId: input.requestId,
        reason: "missing_checkout_session_id",
        status: "FAILED",
      });

      return Result.okay({
        event: {
          eventType: claim.event.eventType,
          idempotent: false,
          providerEventId: claim.event.providerEventId,
          status: "FAILED",
        },
      });
    }

    const processed = await this.repository.processPaidCheckoutSession({
      eventId: claim.event.id,
      now,
      providerCheckoutSessionId: parsed.event.providerCheckoutSessionId,
      requestId: input.requestId,
    });

    return this.resultForProcessedEvent({
      eventType: claim.event.eventType,
      processed,
      providerCheckoutSessionId: claim.event.providerCheckoutSessionId,
      providerEventId: claim.event.providerEventId,
      providerPaymentId: claim.event.providerPaymentId,
      requestId: input.requestId,
    });
  }

  private async resultForProcessedEvent(input: {
    eventType: string;
    processed: ProcessPaidCheckoutSessionResult;
    providerCheckoutSessionId: string | null;
    providerEventId: string;
    providerPaymentId: string | null;
    requestId: string;
  }): Promise<AppResult<PaymentWebhookServiceResult>> {
    if (
      input.processed.decision === "paid" ||
      input.processed.decision === "already-paid"
    ) {
      await this.publishProcessedAudit({
        eventType: input.eventType,
        paymentId: input.processed.paymentId,
        providerCheckoutSessionId: input.providerCheckoutSessionId,
        providerEventId: input.providerEventId,
        providerPaymentId: input.providerPaymentId,
        requestId: input.requestId,
        status: "PROCESSED",
      });
      const reconciliation = await this.confirmPaidPayment({
        paymentId: input.processed.paymentId,
        requestId: input.requestId,
      });

      if (reconciliation.error) {
        return Result.error(reconciliation.error);
      }

      return Result.okay({
        event: {
          eventType: input.eventType,
          idempotent: false,
          providerEventId: input.providerEventId,
          status: "PROCESSED",
        },
        payment: {
          paymentId: input.processed.paymentId,
          status: "PAYMENT_PAID",
        },
        ...(reconciliation.content
          ? {
              order: {
                emailStatus: reconciliation.content.email.status,
                fulfillmentStatus:
                  reconciliation.content.order.fulfillmentStatus,
                orderId: reconciliation.content.order.orderId,
                orderNumber: reconciliation.content.order.orderNumber,
                totalCentavos: reconciliation.content.order.totalCentavos,
              },
            }
          : {}),
      });
    }

    await this.publishRejectedAudit({
      eventType: input.eventType,
      paymentId:
        input.processed.decision === "invalid-state"
          ? input.processed.paymentId
          : undefined,
      providerCheckoutSessionId: input.providerCheckoutSessionId,
      providerEventId: input.providerEventId,
      providerPaymentId: input.providerPaymentId,
      requestId: input.requestId,
      reason: input.processed.decision,
      status: "FAILED",
    });

    return Result.okay({
      event: {
        eventType: input.eventType,
        idempotent: false,
        providerEventId: input.providerEventId,
        status: "FAILED",
      },
    });
  }

  private async confirmPaidPayment(input: {
    now?: string;
    paymentId: string;
    requestId: string;
  }): Promise<AppResult<PaymentReconciliationResult | null>> {
    if (!this.reconciliationService) {
      return Result.okay(null);
    }

    return this.reconciliationService.confirmPaidPayment(input);
  }

  private recordOperationalRejection(input: {
    reason: string;
    requestId: string;
    status: string;
  }) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          details: {
            action: "payment.webhook_rejected",
            reason: input.reason,
            status: input.status,
          },
        })
      );
    } catch {
      // Logging must never mask webhook response.
    }
  }

  private recordOperationalProcessed(input: {
    eventType: string;
    idempotent: boolean;
    providerCheckoutSessionId: string | null;
    providerEventId: string;
    providerPaymentId: string | null;
    requestId: string;
    status: string;
  }) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          targetResourceId: input.providerEventId,
          details: {
            action: "payment.webhook_processed",
            eventType: input.eventType,
            idempotent: input.idempotent,
            providerCheckoutSessionId: input.providerCheckoutSessionId,
            providerEventId: input.providerEventId,
            providerPaymentId: input.providerPaymentId,
            status: input.status,
          },
        })
      );
    } catch {
      // Logging must never mask webhook response.
    }
  }

  private async publishProcessedAudit(input: {
    eventType: string;
    paymentId?: string;
    providerCheckoutSessionId?: string | null;
    providerEventId: string;
    providerPaymentId?: string | null;
    requestId: string;
    status: PayMongoWebhookProcessingStatus;
  }) {
    this.recordOperationalProcessed({
      eventType: input.eventType,
      idempotent: false,
      providerCheckoutSessionId: input.providerCheckoutSessionId ?? null,
      providerEventId: input.providerEventId,
      providerPaymentId: input.providerPaymentId ?? null,
      requestId: input.requestId,
      status: input.status,
    });

    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: "payment.webhook_processed",
          actor: safeActor(),
          target: {
            entity: "payment",
            entityId: input.paymentId ?? input.providerEventId,
          },
          safeDetails: {
            eventType: input.eventType,
            paymentId: input.paymentId,
            providerCheckoutSessionId: input.providerCheckoutSessionId,
            providerEventId: input.providerEventId,
            providerPaymentId: input.providerPaymentId,
            status: input.status,
          },
        })
      );
    } catch {
      // Audit must never mask webhook response.
    }
  }

  private async publishRejectedAudit(input: {
    eventType: string;
    paymentId?: string;
    providerCheckoutSessionId?: string | null;
    providerEventId: string;
    providerPaymentId?: string | null;
    reason: string;
    requestId: string;
    status: PayMongoWebhookProcessingStatus;
  }) {
    this.recordOperationalProcessed({
      eventType: input.eventType,
      idempotent: false,
      providerCheckoutSessionId: input.providerCheckoutSessionId ?? null,
      providerEventId: input.providerEventId,
      providerPaymentId: input.providerPaymentId ?? null,
      requestId: input.requestId,
      status: input.status,
    });

    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: "payment.webhook_rejected",
          actor: safeActor(),
          target: {
            entity: "payment",
            entityId: input.paymentId ?? input.providerEventId,
          },
          safeDetails: {
            eventType: input.eventType,
            paymentId: input.paymentId,
            providerCheckoutSessionId: input.providerCheckoutSessionId,
            providerEventId: input.providerEventId,
            providerPaymentId: input.providerPaymentId,
            reason: input.reason,
            status: input.status,
          },
        })
      );
    } catch {
      // Audit must never mask webhook response.
    }
  }
}
