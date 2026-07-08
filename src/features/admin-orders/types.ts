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
  unitPriceCentavos: number;
  variantLabel: string;
  variantOptions: AdminOrderSnapshotOption[];
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
