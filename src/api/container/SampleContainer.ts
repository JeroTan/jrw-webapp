import { SampleRoutes } from "@/api/routes/SampleRoutes";
import { SampleController } from "@/api/controller/SampleController";
import { SampleService } from "@/domain/services/SampleService";
import type Elysia from "elysia";

// Global instances for performance (initialized once per Worker isolate)
const sampleService = new SampleService();
const sampleController = new SampleController(sampleService);

/**
 * Sample Domain Container
 * Encapsulates the wiring for the Sample domain.
 */
export function SampleContainer(app: Elysia) {
  return app.use(SampleRoutes(sampleController));
}
