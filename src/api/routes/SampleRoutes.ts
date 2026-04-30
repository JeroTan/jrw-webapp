import type { SampleController } from "@/api/controller/SampleController";
import { typedAstroCookies, typedUrlData } from "@/lib/elysia/decorationTypes";
import type Elysia from "elysia";

export const SampleRoutes = (sampleController: SampleController) => (app: Elysia) =>
  app
    .use(typedAstroCookies)
    .use(typedUrlData)
    .group("/sample", (app) => {
      app.get(
        "/",
        ({ astroCookies, urlData }) => {
          return sampleController.handleSample({ astroCookies, urlData });
        },
        {
          detail: {
            summary: "Sample endpoint",
            tags: ["Sample"],
          },
        }
      );
      return app;
    });

