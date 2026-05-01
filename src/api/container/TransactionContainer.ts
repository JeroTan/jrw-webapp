import { TransactionRoutes } from "@/api/routes/TransactionRoutes";
import { TransactionController } from "@/api/controller/TransactionController";
import { TransactionService } from "@/domain/services/TransactionService";
import type Elysia from "elysia";

const transactionService = new TransactionService();
const transactionController = new TransactionController(transactionService);

export function TransactionContainer(app: Elysia) {
  return app.use(TransactionRoutes(transactionController));
}
