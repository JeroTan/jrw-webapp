import type { CatalogService } from "@/domain/services/CatalogService";
import { 
  tboxCreateProductBody, 
  tboxCreateCategoryBody, 
  tboxUpdateCategoryBody, 
  tboxProductFilterQuery
} from "@/domain/validation/catalog";
import { tboxSubmitReviewBody } from "@/domain/validation/transactions";
import type { Static } from "elysia";

export class CatalogController {
  constructor(public catalogService: CatalogService) {}

  async handleListProducts({ query }: { query?: Static<typeof tboxProductFilterQuery> } = {}) {
    return {
      data: this.catalogService.mockListProducts(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "Products retrieved successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleGetProduct({ params }: { params: { id: string } }) {
    return {
      data: this.catalogService.mockGetProduct(params.id),
      message: "Product retrieved successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleCreateProduct({ body }: { body: Static<typeof tboxCreateProductBody> }) {
    return {
      data: this.catalogService.mockCreateProduct(),
      message: "Product created successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleUpdateProduct({ params, body }: { params: { id: string }; body: Static<typeof tboxCreateProductBody> }) {
    return {
      data: this.catalogService.mockUpdateProduct(params.id),
      message: "Product updated successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleDeleteProduct({ params }: { params: { id: string } }) {
    return {
      data: this.catalogService.mockDeleteProduct(params.id),
      message: "Product deleted successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleAdminListProducts({ query }: { query?: Static<typeof tboxProductFilterQuery> } = {}) {
    return {
      data: this.catalogService.mockAdminListProducts(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "Admin products retrieved successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleAdminGetProduct({ params }: { params: { id: string } }) {
    return {
      data: this.catalogService.mockAdminGetProduct(params.id),
      message: "Admin product retrieved successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleListCategories() {
    return {
      data: this.catalogService.mockListCategories(),
      meta: { page: 1, total: 0, limit: 10 },
      message: "Categories retrieved successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleCreateCategory({ body }: { body: Static<typeof tboxCreateCategoryBody> }) {
    return {
      data: this.catalogService.mockCreateCategory(),
      message: "Category created successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleUpdateCategory({ params, body }: { params: { id: string }; body: Static<typeof tboxUpdateCategoryBody> }) {
    return {
      data: this.catalogService.mockUpdateCategory(params.id),
      message: "Category updated successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleDeleteCategory({ params }: { params: { id: string } }) {
    return {
      data: this.catalogService.mockDeleteCategory(params.id),
      message: "Category deleted successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleListReviews({ params }: { params: { id: string } }) {
    return {
      data: this.catalogService.mockListReviews(params.id),
      meta: { page: 1, total: 0, limit: 10 },
      message: "Reviews retrieved successfully",
      code: "SUCCESS" as const,
    };
  }

  async handleSubmitReview({ params, body }: { params: { id: string }; body: Static<typeof tboxSubmitReviewBody> }) {
    return {
      data: this.catalogService.mockSubmitReview(params.id),
      message: "Review submitted successfully",
      code: "SUCCESS" as const,
    };
  }
}
