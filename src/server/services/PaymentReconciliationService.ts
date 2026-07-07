import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import { isReleasableTerminalPaymentStatus } from "@/domain/checkout/inventory-release";
import type { OrderConfirmationEmailNotifier } from "@/domain/notifications/order-confirmation-email";
import { FailingOrderConfirmationEmailNotifier } from "@/domain/notifications/order-confirmation-email";
import type { PaymentStatusEmailNotifier } from "@/domain/notifications/payment-status-email";
import { FailingPaymentStatusEmailNotifier } from "@/domain/notifications/payment-status-email";
import type { PublicPaymentReceipt } from "@/domain/payments/payment-receipt";
import { paymentReturnStatusFromPayment } from "@/domain/payments/payment-reconciliation";
import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import type {
  ConfirmPaidPaymentInput,
  MarkProviderCheckoutSessionPaidInput,
  MarkProviderCheckoutSessionPaidResult,
  MarkProviderCheckoutSessionTerminalInput,
  MarkProviderCheckoutSessionTerminalResult,
  OrderConfirmationRepositoryLike,
  PaymentReturnLookupInput,
  PaymentReturnRecord,
  ProviderTerminalPaymentStatus,
} from "@/server/repositories/OrderConfirmationRepository";
import type {
  InventoryReleaseRepositoryLike,
  InventoryReleaseResult,
  ReleaseStalePendingPaymentsInput,
  ReleaseStalePendingPaymentsResult,
} from "@/server/repositories/InventoryReleaseRepository";
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
  email?: {
    status: "FAILED" | "PENDING" | "SENT" | "SENDING";
  };
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
  receipt?: PublicPaymentReceipt;
  status:
    | "cancelled"
    | "confirmed"
    | "expired"
    | "failed"
    | "pending"
    | "refunded"
    | "unknown";
};

export type CheckoutSessionPaymentStatusResult = {
  paid: boolean;
  providerCheckoutSessionId: string;
  providerPaymentId?: string;
  providerPaymentIntentId?: string;
  status: string;
};

export type CheckoutSessionPaymentStatusProvider = {
  getCheckoutSessionPaymentStatus(
    providerCheckoutSessionId: string
  ): Promise<AppResult<CheckoutSessionPaymentStatusResult>>;
};

export type PaymentReconciliationServiceOptions = {
  auditPublisher?: AuditEventPublisher;
  emailNotifier?: OrderConfirmationEmailNotifier;
  inventoryReleaseRepository?: InventoryReleaseRepositoryLike;
  operationalLogger?: OperationalLogger;
  paymentStatusEmailNotifier?: PaymentStatusEmailNotifier;
  paymentStatusProvider?: CheckoutSessionPaymentStatusProvider;
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

function terminalPaymentStatusFromProviderStatus(
  status: string
): ProviderTerminalPaymentStatus | null {
  switch (status.trim().toLowerCase()) {
    case "cancelled":
    case "canceled":
      return "PAYMENT_CANCELLED";
    case "expired":
      return "PAYMENT_EXPIRED";
    case "failed":
      return "PAYMENT_FAILED";
    default:
      return null;
  }
}

export class PaymentReconciliationService {
  private readonly auditPublisher: AuditEventPublisher;
  private readonly emailNotifier: OrderConfirmationEmailNotifier;
  private readonly inventoryReleaseRepository?: InventoryReleaseRepositoryLike;
  private readonly operationalLogger: OperationalLogger;
  private readonly paymentStatusEmailNotifier: PaymentStatusEmailNotifier;
  private readonly paymentStatusProvider?: CheckoutSessionPaymentStatusProvider;
  private readonly repository: OrderConfirmationRepositoryLike;

  constructor(options: PaymentReconciliationServiceOptions) {
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.emailNotifier =
      options.emailNotifier ?? new FailingOrderConfirmationEmailNotifier();
    this.inventoryReleaseRepository = options.inventoryReleaseRepository;
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.paymentStatusEmailNotifier =
      options.paymentStatusEmailNotifier ??
      new FailingPaymentStatusEmailNotifier();
    this.paymentStatusProvider = options.paymentStatusProvider;
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
      if (error instanceof GeneralError) {
        return Result.error(error);
      }

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

        const fallbackResult = {
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
        } satisfies PaymentReturnStatusResult;

        return Result.okay(
          await this.latestReturnStatusForPayment({
            fallback: fallbackResult,
            now: input.now,
            paymentId: record.paymentId,
            requestId: input.requestId,
          })
        );
      }

      const fallback = await this.reconcilePendingPaymentFromProvider({
        now: input.now,
        record,
        requestId: input.requestId,
      });

      if (fallback) {
        return Result.okay(fallback);
      }

      const timeoutRelease = await this.releaseStalePendingReturnInventory({
        now: input.now,
        record,
        requestId: input.requestId,
      });

      if (timeoutRelease) {
        return Result.okay(timeoutRelease);
      }

      if (isReleasableTerminalPaymentStatus(record.paymentStatus)) {
        await this.releaseTerminalPaymentInventory({
          now: input.now,
          paymentId: record.paymentId,
          requestId: input.requestId,
        });
      }

      return Result.okay(
        await this.returnStatusFromRecord({
          now: input.now,
          record,
          requestId: input.requestId,
        })
      );
    } catch (error) {
      if (error instanceof GeneralError) {
        return Result.error(error);
      }

      if (providerFailure(error)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      return Result.error(new GeneralError({}, "INTERNAL_ERROR"));
    }
  }

  async releaseStalePendingPayments(
    input: ReleaseStalePendingPaymentsInput
  ): Promise<AppResult<ReleaseStalePendingPaymentsResult>> {
    if (!this.inventoryReleaseRepository?.releaseStalePendingPayments) {
      return Result.error(
        new GeneralError(
          { reason: "inventory_release_repository_missing" },
          "PROVIDER_UNAVAILABLE"
        )
      );
    }

    try {
      const result =
        await this.inventoryReleaseRepository.releaseStalePendingPayments(input);

      for (const release of result.results) {
        if (release.decision === "released") {
          await this.publishInventoryReleasedAudit({
            release,
            requestId: input.requestId,
          });
        } else if (release.decision === "failed") {
          this.recordInventoryReleaseFailure({
            paymentId: release.paymentId,
            releaseReason: release.releaseReason,
            reservationId: release.reservationId,
            reason: release.errorCode,
            requestId: input.requestId,
          });
        }
      }

      return Result.okay(result);
    } catch (error) {
      if (error instanceof GeneralError) {
        return Result.error(error);
      }

      if (providerFailure(error)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      return Result.error(new GeneralError({}, "INTERNAL_ERROR"));
    }
  }

  private async reconcilePendingPaymentFromProvider(input: {
    now?: string;
    record: PaymentReturnRecord;
    requestId: string;
  }): Promise<PaymentReturnStatusResult | null> {
    if (
      input.record.paymentStatus !== "PAYMENT_PENDING" ||
      input.record.status !== "pending" ||
      !this.paymentStatusProvider
    ) {
      return null;
    }

    const providerStatus =
      await this.paymentStatusProvider.getCheckoutSessionPaymentStatus(
        input.record.providerCheckoutSessionId
      );

    if (providerStatus.error) {
      this.recordProviderFallbackFailure({
        paymentId: input.record.paymentId,
        reason: providerStatus.error.code,
        requestId: input.requestId,
      });

      return null;
    }

    if (
      providerStatus.content.providerCheckoutSessionId !==
      input.record.providerCheckoutSessionId
    ) {
      this.recordProviderFallbackFailure({
        paymentId: input.record.paymentId,
        reason: "provider_session_mismatch",
        requestId: input.requestId,
      });

      return null;
    }

    if (!providerStatus.content.paid) {
      const terminalStatus = terminalPaymentStatusFromProviderStatus(
        providerStatus.content.status
      );

      if (!terminalStatus) {
        return null;
      }

      const marked = await this.markProviderCheckoutSessionTerminal({
        now: input.now,
        providerCheckoutSessionId: input.record.providerCheckoutSessionId,
        requestId: input.requestId,
        targetStatus: terminalStatus,
      });

      if (
        marked.decision !== "terminal" &&
        marked.decision !== "already-terminal"
      ) {
        this.recordProviderFallbackFailure({
          paymentId:
            marked.decision === "invalid-state"
              ? marked.paymentId
              : input.record.paymentId,
          reason: marked.decision,
          requestId: input.requestId,
        });

        return null;
      }

      const status = paymentReturnStatusFromPayment({
        paymentStatus: marked.paymentStatus,
      });

      await this.releaseTerminalPaymentInventory({
        now: input.now,
        paymentId: marked.paymentId,
        requestId: input.requestId,
      });

      return this.latestReturnStatusForPayment({
        fallback: {
          canRetry: true,
          next: {
            refreshAllowed: false,
            retryCheckoutAllowed: true,
          },
          payment: {
            paymentId: marked.paymentId,
            status: marked.paymentStatus,
          },
          status,
        },
        now: input.now,
        paymentId: marked.paymentId,
        requestId: input.requestId,
      });
    }

    const marked = await this.markProviderCheckoutSessionPaid({
      now: input.now,
      providerCheckoutSessionId: input.record.providerCheckoutSessionId,
      requestId: input.requestId,
    });

    if (marked.decision !== "paid" && marked.decision !== "already-paid") {
      this.recordProviderFallbackFailure({
        paymentId:
          marked.decision === "invalid-state"
            ? marked.paymentId
            : input.record.paymentId,
        reason: marked.decision,
        requestId: input.requestId,
      });

      return null;
    }

    const confirmation = await this.confirmPaidPayment({
      now: input.now,
      paymentId: marked.paymentId,
      requestId: input.requestId,
    });

    if (confirmation.error) {
      throw new GeneralError(
        confirmation.error.data ?? {},
        confirmation.error.code
      );
    }

    return this.latestReturnStatusForPayment({
      fallback: {
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
          paymentId: marked.paymentId,
          status: "PAYMENT_PAID",
        },
        status: "confirmed",
      },
      now: input.now,
      paymentId: marked.paymentId,
      requestId: input.requestId,
    });
  }

  private async releaseStalePendingReturnInventory(input: {
    now?: string;
    record: PaymentReturnRecord;
    requestId: string;
  }): Promise<PaymentReturnStatusResult | null> {
    if (
      !this.inventoryReleaseRepository ||
      input.record.paymentStatus !== "PAYMENT_PENDING" ||
      input.record.status !== "pending"
    ) {
      return null;
    }

    try {
      const release =
        await this.inventoryReleaseRepository.releaseInventoryForPayment({
          allowPendingTimeout: true,
          now: input.now,
          paymentId: input.record.paymentId,
          releaseReason: "PENDING_TIMEOUT",
          requestId: input.requestId,
        });

      if (release.decision === "failed") {
        this.recordInventoryReleaseFailure({
          paymentId: release.paymentId,
          releaseReason: release.releaseReason,
          reservationId: release.reservationId,
          reason: release.errorCode,
          requestId: input.requestId,
        });

        return null;
      }

      if (release.decision === "released") {
        await this.publishInventoryReleasedAudit({
          release,
          requestId: input.requestId,
        });
      }

      const status = paymentReturnStatusFromPayment({
        paymentStatus: release.paymentStatus,
      });

      if (
        (release.decision === "released" ||
          release.decision === "already-released") &&
        status !== "pending"
      ) {
        return this.latestReturnStatusForPayment({
          fallback: {
            canRetry: true,
            next: {
              refreshAllowed: false,
              retryCheckoutAllowed: true,
            },
            payment: {
              paymentId: release.paymentId,
              status: release.paymentStatus,
            },
            status,
          },
          now: input.now,
          paymentId: release.paymentId,
          requestId: input.requestId,
        });
      }

      return null;
    } catch (error) {
      this.recordInventoryReleaseFailure({
        paymentId: input.record.paymentId,
        releaseReason: null,
        reservationId: null,
        reason: error instanceof GeneralError ? error.code : "release_error",
        requestId: input.requestId,
      });

      return null;
    }
  }

  private async releaseTerminalPaymentInventory(input: {
    now?: string;
    paymentId: string;
    requestId: string;
  }): Promise<void> {
    if (!this.inventoryReleaseRepository) {
      return;
    }

    try {
      const release =
        await this.inventoryReleaseRepository.releaseInventoryForPayment({
          now: input.now,
          paymentId: input.paymentId,
          requestId: input.requestId,
        });

      if (release.decision === "failed") {
        this.recordInventoryReleaseFailure({
          paymentId: release.paymentId,
          releaseReason: release.releaseReason,
          reservationId: release.reservationId,
          reason: release.errorCode,
          requestId: input.requestId,
        });
        return;
      }

      if (release.decision === "released") {
        await this.publishInventoryReleasedAudit({
          release,
          requestId: input.requestId,
        });
      }
    } catch (error) {
      this.recordInventoryReleaseFailure({
        paymentId: input.paymentId,
        releaseReason: null,
        reservationId: null,
        reason: error instanceof GeneralError ? error.code : "release_error",
        requestId: input.requestId,
      });
    }
  }

  private async markProviderCheckoutSessionPaid(
    input: MarkProviderCheckoutSessionPaidInput
  ): Promise<MarkProviderCheckoutSessionPaidResult> {
    return this.repository.markProviderCheckoutSessionPaid(input);
  }

  private async markProviderCheckoutSessionTerminal(
    input: MarkProviderCheckoutSessionTerminalInput
  ): Promise<MarkProviderCheckoutSessionTerminalResult> {
    return this.repository.markProviderCheckoutSessionTerminal(input);
  }

  private async sendOrderConfirmationEmailIfNeeded(input: {
    emailStatus: "FAILED" | "PENDING" | "SENT" | "SENDING";
    now?: string;
    orderId: string;
    paymentId: string;
    requestId: string;
  }): Promise<"FAILED" | "PENDING" | "SENT" | "SENDING"> {
    if (input.emailStatus === "SENT") {
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

  private async latestReturnStatusForPayment(input: {
    fallback: PaymentReturnStatusResult;
    now?: string;
    paymentId: string;
    requestId: string;
  }): Promise<PaymentReturnStatusResult> {
    const record = await this.repository.findPaymentReturnRecord({
      paymentId: input.paymentId,
    });

    if (!record) {
      return input.fallback;
    }

    if (
      record.paymentStatus !== input.fallback.payment.status ||
      (input.fallback.status === "confirmed" && record.status !== "confirmed")
    ) {
      return input.fallback;
    }

    return this.returnStatusFromRecord({
      now: input.now,
      record,
      requestId: input.requestId,
    });
  }

  private async returnStatusFromRecord(input: {
    now?: string;
    record: PaymentReturnRecord;
    requestId: string;
  }): Promise<PaymentReturnStatusResult> {
    const emailStatus = await this.sendTerminalPaymentStatusEmailIfNeeded({
      currentStatus: input.record.email.status,
      now: input.now,
      paymentId: input.record.paymentId,
      paymentStatus: input.record.paymentStatus,
      requestId: input.requestId,
    });

    return {
      canRetry: input.record.canRetry,
      email: { status: emailStatus },
      next: {
        refreshAllowed: input.record.status === "pending",
        retryCheckoutAllowed: input.record.canRetry,
      },
      ...(input.record.orderId && input.record.orderNumber
        ? {
            order: {
              orderId: input.record.orderId,
              orderNumber: input.record.orderNumber,
              totalCentavos: input.record.totalCentavos ?? 0,
            },
          }
        : {}),
      payment: {
        paymentId: input.record.paymentId,
        status: input.record.paymentStatus,
      },
      receipt: input.record.receipt,
      status: input.record.status,
    };
  }

  private async sendTerminalPaymentStatusEmailIfNeeded(input: {
    currentStatus: "FAILED" | "PENDING" | "SENT" | "SENDING";
    now?: string;
    paymentId: string;
    paymentStatus: string;
    requestId: string;
  }): Promise<"FAILED" | "PENDING" | "SENT" | "SENDING"> {
    if (
      input.paymentStatus !== "PAYMENT_FAILED" &&
      input.paymentStatus !== "PAYMENT_EXPIRED" &&
      input.paymentStatus !== "PAYMENT_CANCELLED"
    ) {
      return input.currentStatus;
    }

    if (input.currentStatus === "SENT") {
      return input.currentStatus;
    }

    const claimed = await this.repository.claimPaymentStatusEmail({
      now: input.now,
      paymentId: input.paymentId,
      requestId: input.requestId,
    });

    if (!claimed) {
      return "SENDING";
    }

    const email = await this.repository.getPaymentStatusEmail(input.paymentId);

    if (!email) {
      await this.repository.markPaymentStatusEmailFailed({
        now: input.now,
        paymentId: input.paymentId,
        requestId: input.requestId,
      });
      this.recordPaymentStatusEmailFailure({
        paymentId: input.paymentId,
        reason: "missing_email_payload",
        requestId: input.requestId,
      });

      return "FAILED";
    }

    const sent = await this.paymentStatusEmailNotifier.sendPaymentStatusEmail({
      ...email,
      requestId: input.requestId,
    });

    if (sent.ok) {
      await this.repository.markPaymentStatusEmailSent({
        messageId: sent.messageId,
        now: input.now,
        paymentId: input.paymentId,
        requestId: input.requestId,
      });

      return "SENT";
    }

    await this.repository.markPaymentStatusEmailFailed({
      now: input.now,
      paymentId: input.paymentId,
      requestId: input.requestId,
    });
    this.recordPaymentStatusEmailFailure({
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

  private recordPaymentStatusEmailFailure(input: {
    paymentId: string;
    reason: string;
    requestId: string;
  }) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: "PROVIDER_UNAVAILABLE",
          targetResourceId: input.paymentId,
          details: {
            action: "payment.status_email_failed",
            paymentId: input.paymentId,
            reason: input.reason,
          },
        })
      );
    } catch {
      // Logging must never mask payment status response.
    }
  }

  private recordProviderFallbackFailure(input: {
    paymentId: string;
    reason: string;
    requestId: string;
  }) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: "PROVIDER_UNAVAILABLE",
          targetResourceId: input.paymentId,
          details: {
            action: "payment.return_provider_reconciliation_skipped",
            paymentId: input.paymentId,
            reason: input.reason,
          },
        })
      );
    } catch {
      // Logging must never mask payment-return status.
    }
  }

  private recordInventoryReleaseFailure(input: {
    paymentId: string;
    releaseReason: string | null;
    reservationId: string | null;
    reason: string;
    requestId: string;
  }) {
    try {
      this.operationalLogger.record(
        createOperationalLogEvent({
          requestId: input.requestId,
          errorCode: "INTERNAL_ERROR",
          targetResourceId: input.paymentId,
          details: {
            action: "inventory.release_failed",
            errorCode: input.reason,
            paymentId: input.paymentId,
            releaseReason: input.releaseReason,
            reservationId: input.reservationId,
            reason: input.reason,
          },
        })
      );
    } catch {
      // Logging must never mask payment reconciliation.
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

  private async publishInventoryReleasedAudit(input: {
    release: InventoryReleaseResult;
    requestId: string;
  }) {
    if (input.release.decision !== "released" || !input.release.reservationId) {
      return;
    }

    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: "inventory.released",
          actor: safeSystemActor(),
          target: {
            entity: "inventory",
            entityId: input.release.reservationId,
          },
          safeDetails: {
            itemCount: input.release.itemCount,
            paymentId: input.release.paymentId,
            releaseReason: input.release.releaseReason,
            reservationId: input.release.reservationId,
            restoredQuantity: input.release.restoredQuantity,
            source: "payment_reconciliation",
          },
        })
      );
    } catch {
      // Audit must never mask inventory release.
    }
  }
}
