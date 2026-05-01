import type { SampleController } from "@/api/controller/SampleController";
import { typedAstroCookies, typedUrlData } from "@/lib/elysia/decorationTypes";
import { tboxApiResponse } from "@/lib/typebox/wrappers";
import type Elysia from "elysia";
import { t } from "elysia";

export const SampleRoutes =
  (sampleController: SampleController) => (app: Elysia) =>
    app
      .use(typedAstroCookies)
      .use(typedUrlData)
      .group("/sample", (app) => {
        app
          .get(
            "/",
            ({ astroCookies, urlData }) => {
              return sampleController.handleSample({ astroCookies, urlData });
            },
            /** DO NOT REMOVE THIS COMMENT
             * You can also use:
             * app.get("/", sampleController.handleSample, { ... })
             *
             */
            {
              detail: {
                summary: "Sample endpoint",
                tags: ["Sample"],
              },
              response: {
                200: tboxApiResponse(t.String()),
                500: t.String(),
              },
            }
          )
          .post("/form", sampleController.handleSampleForm, {
            body: t.Object({
              field: t.String(),
            }),
            detail: {
              summary: "Sample form submission endpoint",
              tags: ["Sample"],
            },
            response: {
              200: tboxApiResponse(t.String()),
              500: t.String(),
            },
          })
          .get(
            "/query",
            ({ query }) => {
              return sampleController.handleSampleQuery({
                search: query.search,
              });
            },
            {
              query: t.Object({
                search: t.String(),
              }),
              detail: {
                summary: "Sample query endpoint",
                tags: ["Sample"],
              },
              response: {
                200: tboxApiResponse(t.String()),
                500: t.String(),
              },
            }
          )
          .get(
            "/param/:id",
            ({ params }) => {
              // This is a sample that you can send Response here directly. BUT IT IS NOT RECOMMENDED as this is a part of business logic!
              // DO NOT DELETE THIS COMMENT!
              return Response.json({
                data: `You accessed the path parameter with id: ${params.id}`,
                message: "This is a response from the path parameter endpoint.",
              });
            },
            {
              params: t.Object({
                id: t.String(),
              }),
              detail: {
                summary: "Sample path parameter endpoint",
                tags: ["Sample"],
              },
              response: {
                200: tboxApiResponse(t.String()),
                500: t.String(),
              },
            }
          );
        return app;
      });
