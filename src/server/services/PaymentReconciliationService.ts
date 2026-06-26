import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import type { OrderConfirmationEmailNotifier } from "@/domain/notifications/order-confirmation-email";
import { FailingOrderConfirmationEmailNotifier } from "@/domain/notifications/order-confirmation-email";
import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import type {
  ConfirmPaidPaymentInput,
  OrderConfirmationRepositoryLike,
  PaymentReturnLookupInput,
} from "@/server/repositories/OrderConfirmationRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PaymentReconciliationResult = {
  email: {
    status: "FAILED" | "PENDING" | "SENT" | "SENDING";
  };
  order: {
    fulfillmentStatus: string;
    orderId: string;
    orderNumber: string;
    totalCentavos: number;
  };
  payment: {
    paymentId: string;
    status: "PAYMENT_PAID";
  };
};

export type PaymentReturnStatusInput = PaymentReturnLookupInput & {
  now?: string;
  requestId: string;
};

export type PaymentReturnStatusResult = {
  canRetry: boolean;
  next: {
    refreshAllowed: boolean;
    retryCheckoutAllowed: boolean;
  };
  order?: {
    orderId: string;
    orderNumber: string;
    totalCentavos: number;
  };
  payment: {
    paymentId: string;
    status: string;
  };
  status:
    | "cancelled"
    | "confirmed"
    | "expired"
    | "failed"
    | "pending"
    | "refunded"
    | "unknown";
};

export type PaymentReconciliationServiceOptions = {
  auditPublisher?: AuditEventPublisher;
  emailNotifier?: OrderConfirmationEmailNotifier;
  operationalLogger?: OperationalLogger;
  repository: OrderConfirmationRepositoryLike;
};

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction|storage/i.test(
      error.message
    )
  );
}

function safeSystemActor() {
  return {
    type: "system" as const,
    role: "SYSTEM" as const,
    safeIdentifier: "payment-reconciliation",
  };
}

export class PaymentReconciliationService {
  private readonly auditPublisher: AuditEventPublisher;
  private readonly emailNotifier: OrderConfirmationEmailNotifier;
  private readonly operationalLogger: OperationalLogger;
  private readonly repository: OrderConfirmationRepositoryLike;

  constructor(options: PaymentReconciliationServiceOptions) {
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.emailNotifier =
      options.emailNotifier ?? new FailingOrderConfirmationEmailNotifier();
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.repository = options.repository;
  }

  async confirmPaidPayment(
    input: ConfirmPaidPaymentInput
  ): Promise<AppResult<PaymentReconciliationResult>> {
    try {
      const confirmation =
        await this.repository.createOrderConfirmationForPaidPayment(input);

      if (confirmation.decision !== "confirmed") {
        return Result.error(
          new GeneralError({ reason: confirmation.decision }, "CONFLICT_STATE")
        );
      }

      if (confirmation.created) {
        await this.publishOrderCreatedAudit({
          orderId: confirmation.order.orderId,
          paymentId: confirmation.order.paymentId,
          requestId: input.requestId,
        });
      }

      const emailStatus = await this.sendOrderConfirmationEmailIfNeeded({
        emailStatus: confirmation.order.emailStatus,
        now: input.now,
        orderId: confirmation.order.orderId,
        paymentId: confirmation.order.paymentId,
        requestId: input.requestId,
      });

      return Result.okay({
        email: { status: emailStatus },
        order: {
          fulfillmentStatus: confirmation.order.fulfillmentStatus,
          orderId: confirmation.order.orderId,
          orderNumber: confirmation.order.orderNumber,
          totalCentavos: confirmation.order.totalCentavos,
        },
        payment: {
          paymentId: confirmation.order.paymentId,
          status: "PAYMENT_PAID",
        },
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      return Result.error(new GeneralError({}, "INTERNAL_ERROR"));
    }
  }

  async getPaymentReturnStatus(
    input: PaymentReturnStatusInput
  ): Promise<AppResult<PaymentReturnStatusResult>> {
    if (
      !input.attemptId &&
      !input.paymentId &&
      !input.providerCheckoutSessionId
    ) {
      return Result.error(
        new GeneralError({ reasons: ["lookup:required"] }, "VALIDATION_FAILED")
      );
    }

    try {
      const record = await this.repository.findPaymentReturnRecord(input);

      if (!record) {
        return Result.error(new GeneralError({}, "RESOURCE_NOT_FOUND"));
      }

      if (record.paymentStatus === "PAYMENT_PAID" && !record.orderId) {
        const confirmation = await this.confirmPaidPayment({
          now: input.now,
          paymentId: record.paymentId,
          requestId: input.requestId,
        });

        if (confirmation.error) {
          return Result.error(confirmation.error);
        }

        return Result.okay({
          canRetry: false,
          next: {
            refreshAllowed: false,
            retryCheckoutAllowed: false,
          },
          order: {
            orderId: confirmation.content.order.orderId,
            orderNumber: confirmation.content.order.orderNumber,
            totalCentavos: confirmation.content.order.totalCentavos,
          },
          payment: {
            paymentId: record.paymentId,
            status: "PAYMENT_PAID",
          },
          status: "confirmed",
        });
      }

      return Result.okay({
        canRetry: record.canRetry,
        next: {
          refreshAllowed: record.status === "pending",
          retryCheckoutAllowed: record.canRetry,
        },
        ...(record.orderId && record.orderNumber
          ? {
              order: {
                orderId: record.orderId,
                orderNumber: record.orderNumber,
                totalCentavos: record.totalCentavos ?? 0,
              },
            }
          : {}),
        payment: {
          paymentId: record.paymentId,
          status: record.paymentStatus,
        },
        status: record.status,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      return Result.error(new GeneralError({}, "INTERNAL_ERROR"));
    }
  }

  private async sendOrderConfirmationEmailIfNeeded(input: {
    emailStatus: "FAILED" | "PENDING" | "SENT" | "SENDING";
    now?: string;
    orderId: string;
    paymentId: string;
    requestId: string;
  }): Promise<"FAILED" | "PENDING" | "SENT" | "SENDING"> {
    if (input.emailStatus === "SENT" || input.emailStatus === "SENDING") {
      return input.emailStatus;
    }

    const claimed = await this.repository.claimOrderConfirmationEmail({
      now: input.now,
      orderId: input.orderId,
      requestId: input.requestId,
    });

    if (!claimed) {
      return "SENDING";
    }

    const email = await this.repository.getOrderConfirmationEmail(
      input.orderId
    );

    if (!email) {
      await this.repository.markOrderConfirmationEmailFailed({
        now: input.now,
        orderId: input.orderId,
        requestId: input.requestId,
      });
      this.recordEmailFailure({
        orderId: input.orderId,
        paymentId: input.paymentId,
        reason: "missing_email_payload",
        requestId: input.requestId,
      });

      return "FAILED";
    }

    const sent = await this.emailNotifier.sendOrderConfirmationEmail({
      ...email,
      requestId: input.requestId,
    });

    if (sent.ok) {
      await this.repository.markOrderConfirmationEmailSent({
        messageId: sent.messageId,
        now: input.now,
        orderId: input.orderId,
        requestId: input.requestId,
      });

      return "SENT";
    }

    await this.repository.markOrderConfirmationEmailFailed({
      now: input.now,
      orderId: input.orderId,
      requestId: input.requestId,
    });
    this.recordEmailFailure({
      orderId: input.orderId,
      paymentId: input.paymentId,
      reason: "provider_send_failed",
      requestId: input.requestId,
    });

    return "FAILED";
  }

  private recordEmailFailure(input: {
    orderId: string;
    paymentId: string;
    reason: string;
    requestId: string;
  }) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: "PROVIDER_UNAVAILABLE",
          targetResourceId: input.orderId,
          details: {
            action: "order.confirmation_email_failed",
            orderId: input.orderId,
            paymentId: input.paymentId,
            reason: input.reason,
          },
        })
      );
    } catch {
      // Logging must never mask order confirmation.
    }
  }

  private async publishOrderCreatedAudit(input: {
    orderId: string;
    paymentId: string;
    requestId: string;
  }) {
    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: "order.created",
          actor: safeSystemActor(),
          target: {
            entity: "order",
            entityId: input.orderId,
          },
          safeDetails: {
            orderId: input.orderId,
            paymentId: input.paymentId,
            source: "payment_reconciliation",
          },
        })
      );
    } catch {
      // Audit must never mask order confirmation.
    }
  }
}
