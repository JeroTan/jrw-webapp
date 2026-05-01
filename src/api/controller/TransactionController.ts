import type { TransactionService } from "@/domain/services/TransactionService";

export class TransactionController {
  constructor(public transactionService: TransactionService) {}

  async handleAuthCheckout({ body }: { body: any }) {
    return {
      data: this.transactionService.mockAuthCheckout(),
      message: "Authenticated checkout processed",
    };
  }

  async handleGuestCheckout({ body }: { body: any }) {
    return {
      data: this.transactionService.mockGuestCheckout(),
      message: "Guest checkout processed",
    };
  }

  async handleGetOrder({ params }: { params: { id: string } }) {
    return {
      data: this.transactionService.mockGetOrder(params.id),
      message: "Order details retrieved",
    };
  }

  async handlePayMongoWebhook({ body }: { body: any }) {
    return {
      data: this.transactionService.mockPayMongoWebhook(),
      message: "Webhook processed",
    };
  }

  async handleListOrders() {
    return {
      data: this.transactionService.mockListOrders(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "User orders retrieved",
    };
  }

  async handleListAdminOrders() {
    return {
      data: this.transactionService.mockListAdminOrders(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "All orders retrieved",
    };
  }

  async handleUpdateOrderStatus({ params, body }: { params: { id: string }; body: any }) {
    return {
      data: this.transactionService.mockUpdateOrderStatus(params.id, body.status),
      message: "Order status updated",
    };
  }
}
