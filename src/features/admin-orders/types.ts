import type { CustomerOrderStatusLane } from "@/domain/orders/customer-order-status";

export type AdminOrderCustomerKind = "CUSTOMER" | "GUEST";

export type AdminOrderSnapshotOption = {
  group: string;
  name: string;
};

export type AdminOrderSnapshotItem = {
  imageR2Key: string | null;
  lineTotalCentavos: number;
  productName: string;
  productSlug: string | null;
  quantity: number;
  snapshotId: string;
  unitPriceCentavos: number;
  variantLabel: string;
  variantOptions: AdminOrderSnapshotOption[];
};

export type AdminReturnStatus =
  | "RETURN_REQUESTED"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "RETURN_RECEIVED"
  | "RETURN_COMPLETED"
  | "RETURN_CANCELLED";

export type AdminReturnTargetType = "ORDER" | "ITEM";

export type AdminReturnRecord = {
  actorId: string | null;
  amountCentavos: number | null;
  createdAt: string;
  currency: "PHP";
  id: string;
  notes: string | null;
  orderId: string;
  orderSnapshotId: string | null;
  previousStatus: AdminReturnStatus | null;
  reason: string;
  referenceId: string | null;
  status: AdminReturnStatus;
  statusLabel: string;
  targetLabel: string;
  targetType: AdminReturnTargetType;
  updatedAt: string;
};

export type AdminRefundStatus =
  | "REFUND_PENDING"
  | "REFUND_APPROVED"
  | "REFUND_DECLINED"
  | "REFUND_SENT"
  | "REFUND_FAILED";

export type AdminRefundTargetType = "ORDER" | "ITEM";

export type AdminRefundRecord = {
  actorId: string | null;
  amountCentavos: number;
  createdAt: string;
  currency: "PHP";
  id: string;
  notes: string | null;
  orderId: string;
  orderSnapshotId: string | null;
  previousStatus: AdminRefundStatus | null;
  reason: string;
  referenceId: string | null;
  status: AdminRefundStatus;
  statusLabel: string;
  targetLabel: string;
  targetType: AdminRefundTargetType;
  updatedAt: string;
};

export type AdminOrderSummary = {
  checkoutEmailMasked: string | null;
  createdAt: string;
  currency: "PHP";
  customerKind: AdminOrderCustomerKind;
  customerLabel: string;
  fulfillment: CustomerOrderStatusLane;
  itemCount: number;
  orderId: string;
  orderNumber: string;
  payment: CustomerOrderStatusLane;
  refund: CustomerOrderStatusLane;
  return: CustomerOrderStatusLane;
  subtotalCentavos: number;
  totalCentavos: number;
  totalQuantity: number;
  updatedAt: string;
};

export type AdminOrderDetail = AdminOrderSummary & {
  contact: {
    checkoutEmail: string | null;
    fullName: string | null;
    phone: string | null;
  };
  items: AdminOrderSnapshotItem[];
  refundHistory: AdminRefundRecord[];
  returnHistory: AdminReturnRecord[];
  shippingAddress: {
    barangay: string | null;
    cityProvince: string | null;
    postalCode: string | null;
    shippingType: string;
    streetAddress: string | null;
  };
};

export type AdminOrderPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminOrderList = {
  items: AdminOrderSummary[];
  pagination: AdminOrderPagination;
};

export type AdminOrderListQuery = {
  createdFrom?: string;
  createdTo?: string;
  fulfillmentStatus?: string;
  page?: number;
  pageSize?: number;
  paymentStatus?: string;
  search?: string;
};

export type AdminFulfillmentStatus =
  | "ORDER_PLACED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type AdminFulfillmentEmailStatus =
  | "FAILED"
  | "PENDING"
  | "SENT"
  | "SENDING";

export type AdminFulfillmentUpdateResult = {
  allowedNextStatuses: AdminFulfillmentStatus[];
  email: {
    status: AdminFulfillmentEmailStatus;
  };
  order: AdminOrderDetail;
  transition: {
    eventId: string;
    newStatus: AdminFulfillmentStatus;
    oldStatus: AdminFulfillmentStatus;
  };
};

export type AdminReturnRecordRequest = {
  amountCentavos?: number;
  notes?: string;
  orderSnapshotId?: string;
  reason: string;
  referenceId?: string;
  targetStatus: AdminReturnStatus;
  targetType: AdminReturnTargetType;
};

export type AdminReturnRecordResult = {
  allowedNextStatuses: AdminReturnStatus[];
  order: AdminOrderDetail;
  returnRecord: AdminReturnRecord;
};

export type AdminRefundRecordRequest = {
  amountCentavos: number;
  notes?: string;
  orderSnapshotId?: string;
  reason: string;
  referenceId?: string;
  targetStatus: AdminRefundStatus;
  targetType: AdminRefundTargetType;
};

export type AdminRefundRecordResult = {
  allowedNextStatuses: AdminRefundStatus[];
  order: AdminOrderDetail;
  refundRecord: AdminRefundRecord;
};
