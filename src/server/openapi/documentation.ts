export const openApiDocumentation = {
  info: {
    title: "JRW Webapp API",
    version: "0.1.0",
    description:
      "JRW single-store ecommerce API for Admin auth, Customer auth, brand collaboration, catalog, checkout, payments, orders, returns/refunds, assets, and audit workflows.",
  },
  tags: [
    {
      name: "Foundation",
      description: "Canonical API ownership and route group discovery.",
    },
    {
      name: "Admin Auth",
      description:
        "Admin and Super Admin identity, recovery, and governance authentication flows.",
    },
    {
      name: "Customer Auth",
      description:
        "Customer identity, recovery, verification, session, and OAuth flows.",
    },
    { name: "Brands", description: "JRW catalog collaboration groups." },
    {
      name: "Products",
      description: "Catalog, variants, pricing, media, and inventory.",
    },
    {
      name: "Checkout",
      description:
        "Cart validation, inventory reservation, and payment handoff.",
    },
    {
      name: "Payments",
      description: "PayMongo payment state and webhook reconciliation.",
    },
    {
      name: "Orders",
      description: "Customer order status and Admin fulfillment operations.",
    },
    {
      name: "Returns/Refunds",
      description: "Manual return and refund recording.",
    },
    {
      name: "Assets",
      description: "Product asset metadata and R2-backed media.",
    },
    { name: "Audit", description: "Sensitive action and activity history." },
  ],
};
