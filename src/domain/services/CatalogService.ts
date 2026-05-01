export class CatalogService {
  mockListProducts() {
    return [];
  }

  mockGetProduct(id: string) {
    return {
      id,
      name: "Mock Product",
      description: "Mock Description",
      tags: ["mock"],
      variants: [],
      photos: [],
      categories: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  mockCreateProduct() {
    return this.mockGetProduct("prd_mock");
  }

  mockUpdateProduct(id: string) {
    return this.mockGetProduct(id);
  }

  mockDeleteProduct(id: string) {
    return { id };
  }

  mockListCategories() {
    return [];
  }

  mockCreateCategory() {
    return { id: "cat_mock", name: "Mock Category", type: "STYLE" };
  }

  mockUpdateCategory(id: string) {
    return { id, name: "Updated Category", type: "STYLE" };
  }

  mockDeleteCategory(id: string) {
    return { id };
  }

  mockListReviews(productId: string) {
    return [];
  }

  mockSubmitReview(productId: string) {
    return { 
      id: "rev_mock", 
      customer_id: "usr_mock",
      product_id: productId, 
      order_id: "ord_mock",
      rating: 5, 
      comment: null,
      created_at: new Date().toISOString() 
    };
  }
}
