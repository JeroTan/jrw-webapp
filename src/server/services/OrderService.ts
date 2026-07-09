import { evaluateRouteAccess, type RbacActorContext } from "@/domain/auth/rbac";
import {
  createAuditEvent,
  NoopAuditEventPublisher,
  type AuditEventPublisher,
} from "@/domain/audit/events";
import {
  allowedNextFulfillmentStatuses,
  evaluateFulfillmentTransition,
  fulfillmentStatuses,
  isFulfillmentStatus,
  type FulfillmentStatus,
} from "@/domain/orders/fulfillment-transitions";
import {
  allowedNextReturnStatuses,
  evaluateReturnTransition,
  isReturnStatus,
  returnStatuses,
  type ReturnStatus,
} from "@/domain/orders/return-transitions";
import {
  allowedNextRefundStatuses,
  evaluateRefundTransition,
  isLegacyRefundStatusAlias,
  isRefundStatus,
  refundStatuses,
  type RefundStatus,
} from "@/domain/orders/refund-transitions";
import {
  FailingFulfillmentStatusEmailNotifier,
  type FulfillmentStatusEmailNotifier,
} from "@/domain/notifications/fulfillment-status-email";
import {
  createOperationalLogEvent,
  noopOperationalLogger,
  type OperationalLogger,
} from "@/adapter/infrastructure/logging/operational-log";
import type {
  AdminOrderDetailReadModel,
  AdminFulfillmentTransitionSubject,
  AdminOrderListResult,
  AdminRefundRecordReadModel,
  AdminRefundTargetType,
  AdminRefundTransitionSubject,
  AdminReturnRecordReadModel,
  AdminReturnTargetType,
  AdminReturnTransitionSubject,
  CustomerOrderDetailReadModel,
  CustomerOrderListResult,
  FulfillmentEmailStatus,
  FulfillmentStatusEmailRecord,
  GetAdminOrderDetailInput,
  GetCustomerOrderDetailInput,
  ListAdminOrdersInput,
  ListCustomerOrdersInput,
  OrderFulfillmentEventRecord,
  RecordAdminOrderRefundInput,
  RecordAdminOrderRefundResult as RepositoryRecordAdminOrderRefundResult,
  RecordAdminOrderReturnInput,
  RecordAdminOrderReturnResult as RepositoryRecordAdminOrderReturnResult,
  TransitionAdminOrderFulfillmentInput,
  TransitionAdminOrderFulfillmentResult,
} from "@/server/repositories/OrderRepository";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

const adminOrderAuth = {
  mode: "required",
  roles: ["ADMIN"],
} as const;

export type CustomerOrderRepositoryLike = {
  getCustomerOrderDetail(
    input: GetCustomerOrderDetailInput
  ): Promise<CustomerOrderDetailReadModel | null>;
  listCustomerOrders(
    input: ListCustomerOrdersInput
  ): Promise<CustomerOrderListResult>;
};

export type AdminOrderRepositoryLike = {
  claimFulfillmentStatusEmail(input: {
    eventId: string;
    now?: string;
    requestId: string;
  }): Promise<boolean>;
  getAdminFulfillmentTransitionSubject(input: {
    orderIdOrNumber: string;
  }): Promise<AdminFulfillmentTransitionSubject | null>;
  getAdminOrderDetail(
    input: GetAdminOrderDetailInput
  ): Promise<AdminOrderDetailReadModel | null>;
  getAdminRefundTransitionSubject(input: {
    orderIdOrNumber: string;
  }): Promise<AdminRefundTransitionSubject | null>;
  getAdminReturnTransitionSubject(input: {
    orderIdOrNumber: string;
  }): Promise<AdminReturnTransitionSubject | null>;
  getFulfillmentStatusEmail(
    eventId: string
  ): Promise<FulfillmentStatusEmailRecord | null>;
  listAdminOrders(input: ListAdminOrdersInput): Promise<AdminOrderListResult>;
  markFulfillmentStatusEmailFailed(input: {
    eventId: string;
    now?: string;
    requestId: string;
  }): Promise<void>;
  markFulfillmentStatusEmailSent(input: {
    eventId: string;
    messageId?: string;
    now?: string;
    requestId: string;
  }): Promise<void>;
  recordAdminOrderReturn(
    input: RecordAdminOrderReturnInput
  ): Promise<RepositoryRecordAdminOrderReturnResult>;
  recordAdminOrderRefund(
    input: RecordAdminOrderRefundInput
  ): Promise<RepositoryRecordAdminOrderRefundResult>;
  transitionAdminOrderFulfillment(
    input: TransitionAdminOrderFulfillmentInput
  ): Promise<TransitionAdminOrderFulfillmentResult>;
};

export type OrderRepositoryLike = CustomerOrderRepositoryLike &
  AdminOrderRepositoryLike;

export type OrderActorInput = {
  accountStatus?: {
    approved: boolean;
    emailVerified: boolean;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  };
  actorId?: string;
  authenticated: boolean;
  eligibility?: {
    active: boolean;
    approved: boolean;
    emailVerified: boolean;
  };
  role: string;
  safeActorId?: string;
};

export type CustomerOrderActorInput = OrderActorInput;

export type ListCustomerOrdersServiceInput = {
  actor: CustomerOrderActorInput | undefined;
  page?: number;
  pageSize?: number;
  requestId: string;
};

export type GetCustomerOrderDetailServiceInput = {
  actor: CustomerOrderActorInput | undefined;
  orderIdOrNumber: string;
  requestId: string;
};

export type ListAdminOrdersServiceInput = ListAdminOrdersInput & {
  actor: OrderActorInput | undefined;
  requestId: string;
};

export type GetAdminOrderDetailServiceInput = {
  actor: OrderActorInput | undefined;
  orderIdOrNumber: string;
  requestId: string;
};

export type UpdateAdminOrderFulfillmentServiceInput = {
  actor: OrderActorInput | undefined;
  orderIdOrNumber: string;
  requestId: string;
  targetStatus: string;
};

export type UpdateAdminOrderFulfillmentResult = {
  allowedNextStatuses: FulfillmentStatus[];
  email: {
    status: FulfillmentEmailStatus;
  };
  order: AdminOrderDetailReadModel;
  transition: {
    eventId: string;
    newStatus: FulfillmentStatus;
    oldStatus: FulfillmentStatus;
  };
};

export type RecordAdminOrderReturnServiceInput = {
  actor: OrderActorInput | undefined;
  amountCentavos?: number;
  notes?: string;
  orderIdOrNumber: string;
  orderSnapshotId?: string;
  reason: string;
  referenceId?: string;
  requestId: string;
  targetStatus: string;
  targetType: string;
};

export type RecordAdminOrderReturnResult = {
  allowedNextStatuses: ReturnStatus[];
  order: AdminOrderDetailReadModel;
  returnRecord: AdminReturnRecordReadModel;
};

export type RecordAdminOrderRefundServiceInput = {
  actor: OrderActorInput | undefined;
  amountCentavos?: number;
  notes?: string;
  orderIdOrNumber: string;
  orderSnapshotId?: string;
  reason: string;
  referenceId?: string;
  requestId: string;
  targetStatus: string;
  targetType: string;
};

export type RecordAdminOrderRefundResult = {
  allowedNextStatuses: RefundStatus[];
  order: AdminOrderDetailReadModel;
  refundRecord: AdminRefundRecordReadModel;
};

export type OrderServiceOptions = {
  auditPublisher?: AuditEventPublisher;
  emailNotifier?: FulfillmentStatusEmailNotifier;
  now?: () => string;
  operationalLogger?: OperationalLogger;
  repository: OrderRepositoryLike;
};

function serviceError(
  code: ErrorCodeType,
  data: Record<string, unknown> = {}
): GeneralError<Record<string, unknown>> {
  return new GeneralError(data, code);
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction/i.test(
      error.message
    )
  );
}

function normalizeText(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeOptionalText(
  value: string | undefined,
  maxLength: number
): string | null | false {
  if (typeof value === "undefined") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.length <= maxLength ? trimmed : false;
}

function normalizeTargetType(value: string): AdminReturnTargetType | null {
  const normalized = value.trim().toUpperCase();

  return normalized === "ORDER" || normalized === "ITEM" ? normalized : null;
}

function normalizeReturnAmount(value: number | undefined): number | null | false {
  if (typeof value === "undefined") {
    return null;
  }

  return Number.isSafeInteger(value) && value >= 0 ? value : false;
}

function normalizeRefundAmount(value: number | undefined): number | false {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : false;
}

function targetKey(input: {
  orderSnapshotId: string | null;
  targetType: AdminRefundTargetType | AdminReturnTargetType;
}) {
  return input.targetType === "ORDER"
    ? "ORDER"
    : `ITEM:${input.orderSnapshotId ?? ""}`;
}

function latestReturnStatusForTarget(
  subject: AdminReturnTransitionSubject,
  input: {
    orderSnapshotId: string | null;
    targetType: AdminReturnTargetType;
  }
): ReturnStatus | null {
  const expectedKey = targetKey(input);
  const record = (subject.returnHistory ?? []).find(
    (historyRecord) =>
      targetKey({
        orderSnapshotId: historyRecord.orderSnapshotId,
        targetType: historyRecord.targetType,
      }) === expectedKey
  );

  return record?.status ?? null;
}

function latestRefundStatusForTarget(
  subject: AdminRefundTransitionSubject,
  input: {
    orderSnapshotId: string | null;
    targetType: AdminRefundTargetType;
  }
): RefundStatus | null {
  const expectedKey = targetKey(input);
  const record = subject.refundHistory.find(
    (historyRecord) =>
      targetKey({
        orderSnapshotId: historyRecord.orderSnapshotId,
        targetType: historyRecord.targetType,
      }) === expectedKey
  );

  return record?.status ?? null;
}

function refundScopeConflict(
  subject: AdminRefundTransitionSubject,
  input: {
    targetType: AdminRefundTargetType;
  }
): boolean {
  if (input.targetType === "ORDER") {
    return subject.refundHistory.some((record) => record.targetType === "ITEM");
  }

  return subject.refundHistory.some((record) => record.targetType === "ORDER");
}

function refundTargetMaxAmount(
  subject: AdminRefundTransitionSubject,
  input: {
    orderSnapshotId: string | null;
    targetType: AdminRefundTargetType;
  }
): number | null {
  if (input.targetType === "ORDER") {
    return subject.totalCentavos;
  }

  const item = subject.items.find(
    (snapshotItem) => snapshotItem.snapshotId === input.orderSnapshotId
  );

  return item?.lineTotalCentavos ?? null;
}

function requireCustomerActor(
  actor: CustomerOrderActorInput | undefined
): AppResult<{ customerId: string }> {
  if (!actor?.authenticated) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (actor.role !== "CUSTOMER") {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  if (!actor.actorId) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (actor.accountStatus?.status === "SUSPENDED") {
    return Result.error(serviceError("ACCOUNT_SUSPENDED"));
  }

  if (
    actor.accountStatus?.status === "INACTIVE" ||
    actor.eligibility?.active === false
  ) {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  if (
    actor.accountStatus?.emailVerified === false ||
    actor.eligibility?.emailVerified === false
  ) {
    return Result.error(serviceError("EMAIL_NOT_VERIFIED"));
  }

  return Result.okay({ customerId: actor.actorId });
}

function requireAdminActor(
  actor: OrderActorInput | undefined
): AppResult<{ adminId: string; safeActorId: string }> {
  const decision = evaluateRouteAccess({
    auth: adminOrderAuth,
    actor: actor
      ? {
          ...actor,
          role: actor.role as RbacActorContext["role"],
        }
      : undefined,
  });

  if (!decision.allowed) {
    return Result.error(serviceError(decision.code));
  }

  if (!actor?.actorId) {
    return Result.error(serviceError("AUTH_REQUIRED"));
  }

  if (decision.actorRole !== "ADMIN") {
    return Result.error(serviceError("AUTH_FORBIDDEN"));
  }

  return Result.okay({
    adminId: actor.actorId,
    safeActorId: actor.safeActorId ?? actor.actorId,
  });
}

export class OrderService {
  private readonly auditPublisher: AuditEventPublisher;
  private readonly emailNotifier: FulfillmentStatusEmailNotifier;
  private readonly now: () => string;
  private readonly operationalLogger: OperationalLogger;
  private readonly repository: OrderRepositoryLike;

  constructor(options: OrderServiceOptions) {
    this.auditPublisher =
      options.auditPublisher ?? new NoopAuditEventPublisher();
    this.emailNotifier =
      options.emailNotifier ?? new FailingFulfillmentStatusEmailNotifier();
    this.now = options.now ?? (() => new Date().toISOString());
    this.operationalLogger = options.operationalLogger ?? noopOperationalLogger;
    this.repository = options.repository;
  }

  async listCustomerOrders(
    input: ListCustomerOrdersServiceInput
  ): Promise<AppResult<CustomerOrderListResult>> {
    const actor = requireCustomerActor(input.actor);

    if (actor.error) {
      return actor;
    }

    return Result.okay(
      await this.repository.listCustomerOrders({
        customerId: actor.content.customerId,
        page: input.page,
        pageSize: input.pageSize,
      })
    );
  }

  async getCustomerOrderDetail(
    input: GetCustomerOrderDetailServiceInput
  ): Promise<AppResult<CustomerOrderDetailReadModel>> {
    const actor = requireCustomerActor(input.actor);

    if (actor.error) {
      return actor;
    }

    if (input.orderIdOrNumber.trim().length === 0) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    const order = await this.repository.getCustomerOrderDetail({
      customerId: actor.content.customerId,
      orderIdOrNumber: input.orderIdOrNumber.trim(),
    });

    if (!order) {
      return Result.error(serviceError("RESOURCE_NOT_FOUND"));
    }

    return Result.okay(order);
  }

  async listAdminOrders(
    input: ListAdminOrdersServiceInput
  ): Promise<AppResult<AdminOrderListResult>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    try {
      return Result.okay(
        await this.repository.listAdminOrders({
          createdFrom: input.createdFrom,
          createdTo: input.createdTo,
          fulfillmentStatus: input.fulfillmentStatus,
          page: input.page,
          pageSize: input.pageSize,
          paymentStatus: input.paymentStatus,
          search: input.search,
        })
      );
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async getAdminOrderDetail(
    input: GetAdminOrderDetailServiceInput
  ): Promise<AppResult<AdminOrderDetailReadModel>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    if (input.orderIdOrNumber.trim().length === 0) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    try {
      const order = await this.repository.getAdminOrderDetail({
        orderIdOrNumber: input.orderIdOrNumber.trim(),
      });

      if (!order) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      return Result.okay(order);
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
    }
  }

  async updateAdminOrderFulfillment(
    input: UpdateAdminOrderFulfillmentServiceInput
  ): Promise<AppResult<UpdateAdminOrderFulfillmentResult>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    const orderIdOrNumber = input.orderIdOrNumber.trim();
    const targetStatusText = input.targetStatus.trim().toUpperCase();

    if (orderIdOrNumber.length === 0 || targetStatusText.length === 0) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    if (!isFulfillmentStatus(targetStatusText)) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          allowedStatuses: fulfillmentStatuses,
          reason: "UNKNOWN_TARGET_STATUS",
          targetStatus: targetStatusText,
        })
      );
    }

    try {
      const subject =
        await this.repository.getAdminFulfillmentTransitionSubject({
          orderIdOrNumber,
        });

      if (!subject) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      const transitionCheck = evaluateFulfillmentTransition({
        currentStatus: subject.fulfillmentStatus,
        paymentStatus: subject.paymentStatus,
        targetStatus: targetStatusText,
      });

      if (!transitionCheck.allowed) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            allowedNextStatuses: transitionCheck.allowedNextStatuses,
            currentStatus: transitionCheck.currentStatus,
            paymentStatus: transitionCheck.paymentStatus,
            reason: transitionCheck.reason,
            targetStatus: transitionCheck.targetStatus,
          })
        );
      }

      const now = this.now();
      const transition = await this.repository.transitionAdminOrderFulfillment({
        actorId: actor.content.adminId,
        expectedFulfillmentStatus: transitionCheck.oldStatus,
        now,
        orderId: subject.orderId,
        requestId: input.requestId,
        targetStatus: transitionCheck.newStatus,
      });

      if (transition.decision === "missing-order") {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      if (transition.decision === "stale") {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            allowedNextStatuses: allowedNextFulfillmentStatuses(
              transition.currentFulfillmentStatus
            ),
            currentStatus: transition.currentFulfillmentStatus,
            reason: "STALE_FULFILLMENT_STATUS",
            targetStatus: transitionCheck.newStatus,
          })
        );
      }

      const emailStatus = await this.sendFulfillmentStatusEmailIfNeeded({
        event: transition.event,
        now,
        requestId: input.requestId,
      });
      await this.publishFulfillmentAudit({
        actorId: actor.content.adminId,
        event: transition.event,
        requestId: input.requestId,
        safeActorId: actor.content.safeActorId,
      });

      return Result.okay({
        allowedNextStatuses: allowedNextFulfillmentStatuses(
          transition.event.newFulfillmentStatus
        ),
        email: { status: emailStatus },
        order: transition.order,
        transition: {
          eventId: transition.event.eventId,
          newStatus: transition.event.newFulfillmentStatus,
          oldStatus: transition.event.oldFulfillmentStatus,
        },
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("INTERNAL_ERROR"));
    }
  }

  async recordAdminOrderReturn(
    input: RecordAdminOrderReturnServiceInput
  ): Promise<AppResult<RecordAdminOrderReturnResult>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    const orderIdOrNumber = input.orderIdOrNumber.trim();
    const targetType = normalizeTargetType(input.targetType);
    const targetStatusText = input.targetStatus.trim().toUpperCase();
    const reason = normalizeText(input.reason);
    const notes = normalizeOptionalText(input.notes, 2_000);
    const referenceId = normalizeOptionalText(input.referenceId, 128);
    const amountCentavos = normalizeReturnAmount(input.amountCentavos);
    const orderSnapshotId = normalizeText(input.orderSnapshotId);

    if (
      orderIdOrNumber.length === 0 ||
      !targetType ||
      targetStatusText.length === 0 ||
      !reason ||
      reason.length > 512 ||
      notes === false ||
      referenceId === false ||
      amountCentavos === false
    ) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    if (!isReturnStatus(targetStatusText)) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          allowedStatuses: returnStatuses,
          reason: "UNKNOWN_TARGET_STATUS",
          targetStatus: targetStatusText,
        })
      );
    }

    if (
      (targetType === "ITEM" && !orderSnapshotId) ||
      (targetType === "ORDER" && orderSnapshotId)
    ) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "INVALID_RETURN_TARGET",
          targetType,
        })
      );
    }

    try {
      const subject = await this.repository.getAdminReturnTransitionSubject({
        orderIdOrNumber,
      });

      if (!subject) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      if (
        targetType === "ITEM" &&
        !subject.items.some((item) => item.snapshotId === orderSnapshotId)
      ) {
        return Result.error(
          serviceError("VALIDATION_FAILED", {
            reason: "INVALID_RETURN_TARGET",
            targetType,
          })
        );
      }

      const currentTargetStatus = latestReturnStatusForTarget(subject, {
        orderSnapshotId,
        targetType,
      });

      const transitionCheck = evaluateReturnTransition({
        currentStatus: currentTargetStatus,
        fulfillmentStatus: subject.fulfillmentStatus,
        paymentStatus: subject.paymentStatus,
        targetStatus: targetStatusText,
      });

      if (!transitionCheck.allowed) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            allowedNextStatuses: transitionCheck.allowedNextStatuses,
            currentStatus: transitionCheck.currentStatus,
            fulfillmentStatus: transitionCheck.fulfillmentStatus,
            paymentStatus: transitionCheck.paymentStatus,
            reason: transitionCheck.reason,
            targetStatus: transitionCheck.targetStatus,
          })
        );
      }

      const returnResult = await this.repository.recordAdminOrderReturn({
        actorId: actor.content.adminId,
        amountCentavos,
        expectedReturnStatus: transitionCheck.oldStatus,
        notes,
        now: this.now(),
        orderId: subject.orderId,
        orderSnapshotId,
        reason,
        referenceId,
        requestId: input.requestId,
        targetStatus: transitionCheck.newStatus,
        targetType,
      });

      if (returnResult.decision === "missing-order") {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      if (returnResult.decision === "invalid-target") {
        return Result.error(
          serviceError("VALIDATION_FAILED", {
            reason: "INVALID_RETURN_TARGET",
            targetType,
          })
        );
      }

      if (returnResult.decision === "stale") {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            allowedNextStatuses: allowedNextReturnStatuses(
              returnResult.currentReturnStatus
            ),
            currentStatus: returnResult.currentReturnStatus,
            reason: returnResult.reason ?? "STALE_RETURN_STATUS",
            targetStatus: transitionCheck.newStatus,
          })
        );
      }

      await this.publishReturnAudit({
        actorId: actor.content.adminId,
        requestId: input.requestId,
        returnRecord: returnResult.returnRecord,
        safeActorId: actor.content.safeActorId,
      });

      return Result.okay({
        allowedNextStatuses: allowedNextReturnStatuses(
          returnResult.returnRecord.status
        ),
        order: returnResult.order,
        returnRecord: returnResult.returnRecord,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("INTERNAL_ERROR"));
    }
  }

  async recordAdminOrderRefund(
    input: RecordAdminOrderRefundServiceInput
  ): Promise<AppResult<RecordAdminOrderRefundResult>> {
    const actor = requireAdminActor(input.actor);

    if (actor.error) {
      return actor;
    }

    const orderIdOrNumber = input.orderIdOrNumber.trim();
    const targetType = normalizeTargetType(input.targetType);
    const targetStatusText = input.targetStatus.trim().toUpperCase();
    const reason = normalizeText(input.reason);
    const notes = normalizeOptionalText(input.notes, 2_000);
    const referenceId = normalizeOptionalText(input.referenceId, 128);
    const amountCentavos = normalizeRefundAmount(input.amountCentavos);
    const orderSnapshotId = normalizeText(input.orderSnapshotId);

    if (
      orderIdOrNumber.length === 0 ||
      !targetType ||
      targetStatusText.length === 0 ||
      !reason ||
      reason.length > 512 ||
      notes === false ||
      referenceId === false ||
      amountCentavos === false
    ) {
      return Result.error(serviceError("VALIDATION_FAILED"));
    }

    if (isLegacyRefundStatusAlias(targetStatusText)) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "LEGACY_REFUND_STATUS_ALIAS",
          targetStatus: targetStatusText,
        })
      );
    }

    if (!isRefundStatus(targetStatusText)) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          allowedStatuses: refundStatuses,
          reason: "UNKNOWN_TARGET_STATUS",
          targetStatus: targetStatusText,
        })
      );
    }

    if (
      (targetType === "ITEM" && !orderSnapshotId) ||
      (targetType === "ORDER" && orderSnapshotId)
    ) {
      return Result.error(
        serviceError("VALIDATION_FAILED", {
          reason: "INVALID_REFUND_TARGET",
          targetType,
        })
      );
    }

    try {
      const subject = await this.repository.getAdminRefundTransitionSubject({
        orderIdOrNumber,
      });

      if (!subject) {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      if (
        targetType === "ITEM" &&
        !subject.items.some((item) => item.snapshotId === orderSnapshotId)
      ) {
        return Result.error(
          serviceError("VALIDATION_FAILED", {
            reason: "INVALID_REFUND_TARGET",
            targetType,
          })
        );
      }

      if (refundScopeConflict(subject, { targetType })) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            reason: "REFUND_SCOPE_CONFLICT",
            targetType,
          })
        );
      }

      const maxAmountCentavos = refundTargetMaxAmount(subject, {
        orderSnapshotId,
        targetType,
      });

      if (maxAmountCentavos === null) {
        return Result.error(
          serviceError("VALIDATION_FAILED", {
            reason: "INVALID_REFUND_TARGET",
            targetType,
          })
        );
      }

      if (amountCentavos > maxAmountCentavos) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            amountCentavos,
            maxAmountCentavos,
            reason: "AMOUNT_EXCEEDS_TARGET",
          })
        );
      }

      const currentTargetStatus = latestRefundStatusForTarget(subject, {
        orderSnapshotId,
        targetType,
      });

      const transitionCheck = evaluateRefundTransition({
        currentStatus: currentTargetStatus,
        paymentStatus: subject.paymentStatus,
        referenceId,
        targetStatus: targetStatusText,
      });

      if (!transitionCheck.allowed) {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            allowedNextStatuses: transitionCheck.allowedNextStatuses,
            currentStatus: transitionCheck.currentStatus,
            paymentStatus: transitionCheck.paymentStatus,
            reason: transitionCheck.reason,
            targetStatus: transitionCheck.targetStatus,
          })
        );
      }

      const refundResult = await this.repository.recordAdminOrderRefund({
        actorId: actor.content.adminId,
        amountCentavos,
        expectedRefundStatus: transitionCheck.oldStatus,
        notes,
        now: this.now(),
        orderId: subject.orderId,
        orderSnapshotId,
        reason,
        referenceId,
        requestId: input.requestId,
        targetStatus: transitionCheck.newStatus,
        targetType,
      });

      if (refundResult.decision === "missing-order") {
        return Result.error(serviceError("RESOURCE_NOT_FOUND"));
      }

      if (refundResult.decision === "invalid-target") {
        return Result.error(
          serviceError("VALIDATION_FAILED", {
            reason: "INVALID_REFUND_TARGET",
            targetType,
          })
        );
      }

      if (refundResult.decision === "stale") {
        return Result.error(
          serviceError("CONFLICT_STATE", {
            allowedNextStatuses: allowedNextRefundStatuses(
              refundResult.currentRefundStatus
            ),
            currentStatus: refundResult.currentRefundStatus,
            maxAmountCentavos: refundResult.maxAmountCentavos,
            reason: refundResult.reason ?? "STALE_REFUND_STATUS",
            targetStatus: transitionCheck.newStatus,
          })
        );
      }

      await this.publishRefundAudit({
        actorId: actor.content.adminId,
        refundRecord: refundResult.refundRecord,
        requestId: input.requestId,
        safeActorId: actor.content.safeActorId,
      });

      return Result.okay({
        allowedNextStatuses: allowedNextRefundStatuses(
          refundResult.refundRecord.status
        ),
        order: refundResult.order,
        refundRecord: refundResult.refundRecord,
      });
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(serviceError("PROVIDER_UNAVAILABLE"));
      }

      return Result.error(serviceError("INTERNAL_ERROR"));
    }
  }

  private async sendFulfillmentStatusEmailIfNeeded(input: {
    event: OrderFulfillmentEventRecord;
    now: string;
    requestId: string;
  }): Promise<FulfillmentEmailStatus> {
    if (input.event.emailStatus === "SENT") {
      return "SENT";
    }

    try {
      const claimed = await this.repository.claimFulfillmentStatusEmail({
        eventId: input.event.eventId,
        now: input.now,
        requestId: input.requestId,
      });

      if (!claimed) {
        return "SENDING";
      }

      const email = await this.repository.getFulfillmentStatusEmail(
        input.event.eventId
      );

      if (!email) {
        await this.repository.markFulfillmentStatusEmailFailed({
          eventId: input.event.eventId,
          now: input.now,
          requestId: input.requestId,
        });
        this.recordFulfillmentEmailFailure({
          eventId: input.event.eventId,
          orderId: input.event.orderId,
          reason: "missing_email_payload",
          requestId: input.requestId,
        });

        return "FAILED";
      }

      const sent = await this.emailNotifier.sendFulfillmentStatusEmail({
        ...email,
        requestId: input.requestId,
      });

      if (sent.ok) {
        await this.repository.markFulfillmentStatusEmailSent({
          eventId: input.event.eventId,
          messageId: sent.messageId,
          now: input.now,
          requestId: input.requestId,
        });

        return "SENT";
      }

      await this.repository.markFulfillmentStatusEmailFailed({
        eventId: input.event.eventId,
        now: input.now,
        requestId: input.requestId,
      });
      this.recordFulfillmentEmailFailure({
        eventId: input.event.eventId,
        orderId: input.event.orderId,
        reason: "provider_send_failed",
        requestId: input.requestId,
      });

      return "FAILED";
    } catch {
      this.recordFulfillmentEmailFailure({
        eventId: input.event.eventId,
        orderId: input.event.orderId,
        reason: "email_state_failed",
        requestId: input.requestId,
      });

      return "FAILED";
    }
  }

  private recordFulfillmentEmailFailure(input: {
    eventId: string;
    orderId: string;
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
            action: "fulfillment.email_failed",
            eventId: input.eventId,
            orderId: input.orderId,
            reason: input.reason,
          },
        })
      );
    } catch {
      // Logging must never mask fulfillment update.
    }
  }

  private async publishFulfillmentAudit(input: {
    actorId: string;
    event: OrderFulfillmentEventRecord;
    requestId: string;
    safeActorId: string;
  }) {
    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: fulfillmentAuditAction(input.event.newFulfillmentStatus),
          actor: {
            id: input.actorId,
            role: "ADMIN",
            safeIdentifier: input.safeActorId,
            type: "user",
          },
          target: {
            entity: "order",
            entityId: input.event.orderId,
          },
          safeDetails: {
            fulfillmentEventId: input.event.eventId,
            newFulfillmentStatus: input.event.newFulfillmentStatus,
            oldFulfillmentStatus: input.event.oldFulfillmentStatus,
            orderId: input.event.orderId,
            source: "admin_fulfillment",
          },
        })
      );
    } catch {
      // Audit must never mask fulfillment update.
    }
  }

  private async publishReturnAudit(input: {
    actorId: string;
    requestId: string;
    returnRecord: AdminReturnRecordReadModel;
    safeActorId: string;
  }) {
    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: input.returnRecord.previousStatus
            ? "refund-return.status_changed"
            : "refund-return.return_recorded",
          actor: {
            id: input.actorId,
            role: "ADMIN",
            safeIdentifier: input.safeActorId,
            type: "user",
          },
          target: {
            entity: "refund-return",
            entityId: input.returnRecord.id,
          },
          safeDetails: {
            amountCentavos: input.returnRecord.amountCentavos,
            newReturnStatus: input.returnRecord.status,
            oldReturnStatus: input.returnRecord.previousStatus,
            orderId: input.returnRecord.orderId,
            returnRecordId: input.returnRecord.id,
            source: "admin_return",
            targetType: input.returnRecord.targetType,
          },
        })
      );
    } catch {
      // Audit must never mask return recording.
    }
  }

  private async publishRefundAudit(input: {
    actorId: string;
    refundRecord: AdminRefundRecordReadModel;
    requestId: string;
    safeActorId: string;
  }) {
    try {
      await this.auditPublisher.publish(
        createAuditEvent({
          requestId: input.requestId,
          action: input.refundRecord.previousStatus
            ? "refund-return.status_changed"
            : "refund-return.refund_recorded",
          actor: {
            id: input.actorId,
            role: "ADMIN",
            safeIdentifier: input.safeActorId,
            type: "user",
          },
          target: {
            entity: "refund-return",
            entityId: input.refundRecord.id,
          },
          safeDetails: {
            amountCentavos: input.refundRecord.amountCentavos,
            newRefundStatus: input.refundRecord.status,
            oldRefundStatus: input.refundRecord.previousStatus,
            orderId: input.refundRecord.orderId,
            refundRecordId: input.refundRecord.id,
            source: "admin_refund",
            targetType: input.refundRecord.targetType,
          },
        })
      );
    } catch {
      // Audit must never mask refund recording.
    }
  }
}

function fulfillmentAuditAction(status: FulfillmentStatus) {
  if (status === "CANCELLED") {
    return "order.cancelled" as const;
  }

  if (status === "DELIVERED") {
    return "order.fulfilled" as const;
  }

  return "order.status_changed" as const;
}
