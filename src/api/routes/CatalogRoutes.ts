import type { CatalogController } from "@/api/controller/CatalogController";
import { tboxApiResponse, tboxPaginatedResponse } from "@/lib/typebox/wrappers";
import { 
  tboxProductDetails, 
  tboxCreateProductBody, 
  tboxCategory,
  tboxCreateCategoryBody,
  tboxUpdateCategoryBody,
  tboxProductFilterQuery
} from "@/domain/validation/catalog";
import { tboxReview, tboxSubmitReviewBody } from "@/domain/validation/transactions";
import type Elysia from "elysia";
import { t } from "elysia";

export const CatalogRoutes =
  (catalogController: CatalogController) => (app: Elysia) =>
    app
      .group("/catalog", (app) =>
        app
          .group("/products", (app) =>
            app
              .get("/", catalogController.handleListProducts, {
                query: tboxProductFilterQuery,
                detail: { 
                  summary: "List products", 
                  description: "Retrieves a paginated list of public products. Supports full-text search, category filtering, price range filtering, and multi-field sorting.",
                  tags: ["Catalog"] 
                },
                response: { 200: tboxPaginatedResponse(tboxProductDetails), 500: t.String() },
              })
              .get("/:id", catalogController.handleGetProduct, {
                params: t.Object({ id: t.String() }),
                detail: { 
                  summary: "Get product details", 
                  description: "Retrieves full details for a specific product by its ID, including all its associated variants, photos, and categories.",
                  tags: ["Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxProductDetails), 500: t.String() },
              })
              .get("/:id/reviews", catalogController.handleListReviews, {
                params: t.Object({ id: t.String() }),
                detail: { 
                  summary: "List product reviews", 
                  description: "Retrieves a paginated list of customer reviews for a specific product.",
                  tags: ["Catalog"] 
                },
                response: { 200: tboxPaginatedResponse(tboxReview), 500: t.String() },
              })
              .post("/:id/reviews", catalogController.handleSubmitReview, {
                params: t.Object({ id: t.String() }),
                body: tboxSubmitReviewBody,
                detail: { 
                  summary: "Submit product review", 
                  description: "Allows an authenticated customer to submit a review (rating and optional comment) for a specific product they have purchased.",
                  tags: ["Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxReview), 500: t.String() },
              })
          )
          .group("/categories", (app) =>
            app
              .get("/", catalogController.handleListCategories, {
                detail: { 
                  summary: "List categories", 
                  description: "Retrieves a paginated list of all active product categories.",
                  tags: ["Catalog"] 
                },
                response: { 200: tboxPaginatedResponse(tboxCategory), 500: t.String() },
              })
          )
      )
      .group("/admin/catalog", (app) =>
        app
          .group("/products", (app) =>
            app
              .get("/", catalogController.handleAdminListProducts, {
                query: tboxProductFilterQuery,
                detail: { 
                  summary: "List all products (Admin)", 
                  description: "Retrieves a paginated list of all products, including drafts and hidden items. Requires active admin authorization token. Supports filtering and multi-field sorting.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxPaginatedResponse(tboxProductDetails), 500: t.String() },
              })
              .get("/:id", catalogController.handleAdminGetProduct, {
                params: t.Object({ id: t.String() }),
                detail: { 
                  summary: "Get product details (Admin)", 
                  description: "Retrieves full details for any product, regardless of visibility status. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxProductDetails), 500: t.String() },
              })
              .post("/", catalogController.handleCreateProduct, {
                body: tboxCreateProductBody,
                detail: { 
                  summary: "Create product", 
                  description: "Creates a new product along with its initial variants and photos. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxProductDetails), 500: t.String() },
              })
              .put("/:id", catalogController.handleUpdateProduct, {
                params: t.Object({ id: t.String() }),
                body: tboxCreateProductBody,
                detail: { 
                  summary: "Update product", 
                  description: "Updates an existing product's details, variants, or photos. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxProductDetails), 500: t.String() },
              })
              .delete("/:id", catalogController.handleDeleteProduct, {
                params: t.Object({ id: t.String() }),
                detail: { 
                  summary: "Delete product", 
                  description: "Permanently deletes a product and cascades deletion to its variants and photos. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(t.Object({ id: t.String() })), 500: t.String() },
              })
          )
          .group("/categories", (app) =>
            app
              .post("/", catalogController.handleCreateCategory, {
                body: tboxCreateCategoryBody,
                detail: { 
                  summary: "Create category", 
                  description: "Creates a new product category. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxCategory), 500: t.String() },
              })
              .put("/:id", catalogController.handleUpdateCategory, {
                params: t.Object({ id: t.String() }),
                body: tboxUpdateCategoryBody,
                detail: { 
                  summary: "Update category", 
                  description: "Updates an existing product category. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(tboxCategory), 500: t.String() },
              })
              .delete("/:id", catalogController.handleDeleteCategory, {
                params: t.Object({ id: t.String() }),
                detail: { 
                  summary: "Delete category", 
                  description: "Permanently deletes a product category. Requires active admin authorization token.",
                  tags: ["Admin Catalog"] 
                },
                response: { 200: tboxApiResponse(t.Object({ id: t.String() })), 500: t.String() },
              })
          )
      );
