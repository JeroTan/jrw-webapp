import type { TransactionController } from "@/api/controller/TransactionController";
import { tboxApiResponse, tboxPaginatedResponse } from "@/lib/typebox/wrappers";
import { 
  tboxAuthCheckoutBody, 
  tboxGuestCheckoutBody, 
  tboxOrderDetails,
  tboxUpdateOrderStatusBody,
  tboxOrder,
  tboxOrderFilterQuery
} from "@/domain/validation/transactions";
import type Elysia from "elysia";
import { t } from "elysia";

export const TransactionRoutes =
  (transactionController: TransactionController) => (app: Elysia) =>
    app
      .group("/checkout", (app) =>
        app
          .post("/auth", transactionController.handleAuthCheckout, {
            body: tboxAuthCheckoutBody,
            detail: { 
              summary: "Checkout for authenticated users", 
              description: "Processes a checkout for an authenticated customer. Automatically ties the created order to their customer ID.",
              tags: ["Transactions"] 
            },
            response: { 200: tboxApiResponse(tboxOrderDetails), 500: t.String() },
          })
          .post("/guest", transactionController.handleGuestCheckout, {
            body: tboxGuestCheckoutBody,
            detail: { 
              summary: "Checkout for guests", 
              description: "Processes a checkout for a guest user. Requires full personal and shipping information. Creates a guest order not tied to an account.",
              tags: ["Transactions"] 
            },
            response: { 200: tboxApiResponse(tboxOrderDetails), 500: t.String() },
          })
      )
      .group("/orders", (app) =>
        app
          .get("/", transactionController.handleListOrders, {
            query: tboxOrderFilterQuery,
            detail: { 
              summary: "List user orders", 
              description: "Retrieves a paginated list of orders belonging to the authenticated customer.",
              tags: ["Transactions"] 
            },
            response: { 200: tboxPaginatedResponse(tboxOrder), 500: t.String() },
          })
          .get("/:id", transactionController.handleGetOrder, {
            params: t.Object({ id: t.String() }),
            detail: { 
              summary: "Get order details", 
              description: "Retrieves detailed information about a specific order, including item snapshots. The authenticated customer must own the order.",
              tags: ["Transactions"] 
            },
            response: { 200: tboxApiResponse(tboxOrderDetails), 500: t.String() },
          })
      )
      .group("/admin", (app) =>
        app
          .group("/orders", (app) =>
            app
              .get("/", transactionController.handleListAdminOrders, {
                query: tboxOrderFilterQuery,
                detail: { 
                  summary: "List all orders (Admin)", 
                  description: "Retrieves a paginated list of all orders across the system. Requires active admin authorization token. Supports filtering by status and multi-field sorting.",
                  tags: ["Admin Transactions"] 
                },
                response: { 200: tboxPaginatedResponse(tboxOrder), 500: t.String() },
              })
              .patch("/:id/status", transactionController.handleUpdateOrderStatus, {
                params: t.Object({ id: t.String() }),
                body: tboxUpdateOrderStatusBody,
                detail: { 
                  summary: "Update order status (Admin)", 
                  description: "Updates the fulfillment or payment status of an order. Requires active admin authorization token.",
                  tags: ["Admin Transactions"] 
                },
                response: { 200: tboxApiResponse(tboxOrderDetails), 500: t.String() },
              })
          )
      )
      .group("/webhooks", (app) =>
        app.post("/paymongo", transactionController.handlePayMongoWebhook, {
          detail: { 
            summary: "PayMongo webhook receiver", 
            description: "Public endpoint for receiving payment status updates directly from the PayMongo API. Requires valid signature verification.",
            tags: ["Webhooks"] 
          },
          response: { 200: tboxApiResponse(t.Any()), 500: t.String() },
        })
      );

