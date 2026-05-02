import type { TransactionService } from "@/domain/services/TransactionService";
import { 
  tboxAuthCheckoutBody, 
  tboxGuestCheckoutBody, 
  tboxUpdateOrderStatusBody, 
  tboxOrderFilterQuery 
} from "@/domain/validation/transactions";
import type { Static } from "elysia";

export class TransactionController {
  constructor(public transactionService: TransactionService) {}

  async handleAuthCheckout({ body }: { body: Static<typeof tboxAuthCheckoutBody> }) {
    return {
      data: this.transactionService.mockAuthCheckout(),
      message: "Authenticated checkout processed",
      code: "SUCCESS" as const,
    };
  }

  async handleGuestCheckout({ body }: { body: Static<typeof tboxGuestCheckoutBody> }) {
    return {
      data: this.transactionService.mockGuestCheckout(),
      message: "Guest checkout processed",
      code: "SUCCESS" as const,
    };
  }

  async handleGetOrder({ params }: { params: { id: string } }) {
    return {
      data: this.transactionService.mockGetOrder(params.id),
      message: "Order details retrieved",
      code: "SUCCESS" as const,
    };
  }

  async handlePayMongoWebhook({ body }: { body: any }) {
    return {
      data: this.transactionService.mockPayMongoWebhook(),
      message: "Webhook processed",
      code: "SUCCESS" as const,
    };
  }

  async handleListOrders({ query }: { query?: Static<typeof tboxOrderFilterQuery> } = {}) {
    return {
      data: this.transactionService.mockListOrders(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "User orders retrieved",
      code: "SUCCESS" as const,
    };
  }

  async handleListAdminOrders({ query }: { query?: Static<typeof tboxOrderFilterQuery> } = {}) {
    return {
      data: this.transactionService.mockListAdminOrders(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "All orders retrieved",
      code: "SUCCESS" as const,
    };
  }

  async handleUpdateOrderStatus({ params, body }: { params: { id: string }; body: Static<typeof tboxUpdateOrderStatusBody> }) {
    return {
      data: this.transactionService.mockUpdateOrderStatus(params.id, body.status),
      message: "Order status updated",
      code: "SUCCESS" as const,
    };
  }
}
