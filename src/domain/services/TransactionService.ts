export class TransactionService {
  mockAuthCheckout() {
    return this.mockGetOrder("ord_mock_auth");
  }

  mockGuestCheckout() {
    return this.mockGetOrder("ord_mock_guest");
  }

  mockGetOrder(id: string) {
    return {
      id,
      customer_id: "usr_mock",
      status: "PENDING" as const,
      status_description: "Waiting for payment",
      shipping_type: "STANDARD" as const,
      total_amount: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      snapshots: [],
    };
  }

  mockPayMongoWebhook() {
    return { status: "received" };
  }

  mockListOrders() {
    return [];
  }

  mockListAdminOrders() {
    return [];
  }

  mockUpdateOrderStatus(id: string, status: any) {
    return { ...this.mockGetOrder(id), status: status as "PENDING" | "FAILED" | "ON_THE_WAY" | "FULFILLED" };
  }
}
