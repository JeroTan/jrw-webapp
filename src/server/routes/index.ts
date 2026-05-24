import type { AnyElysia } from "elysia";
import {
  adminAccountRoutes,
  type AdminAccountRoutesOptions,
} from "./admin-accounts.routes";
import {
  accountRecoveryRoutes,
  type AccountRecoveryRoutesOptions,
} from "./account-recovery.routes";
import { authRoutes, type AuthRoutesOptions } from "./auth.routes";
import { brandsRoutes, type BrandRoutesOptions } from "./brands.routes";
import {
  categoriesRoutes,
  type CategoryRoutesOptions,
} from "./categories.routes";
import { customerRoutes, type CustomerRoutesOptions } from "./customer.routes";
import { foundationRoutes } from "./foundation.routes";
import {
  googleOAuthRoutes,
  type GoogleOAuthRoutesOptions,
} from "./google-oauth.routes";
import { imagesRoutes, type ImageRoutesOptions } from "./images.routes";
import {
  inventoryRoutes,
  type InventoryRoutesOptions,
} from "./inventory.routes";
import {
  ownerGovernanceRoutes,
  type OwnerGovernanceRoutesOptions,
} from "./owner-governance.routes";
import { productsRoutes, type ProductRoutesOptions } from "./products.routes";
import {
  snapshotsRoutes,
  type SnapshotRoutesOptions,
} from "./snapshots.routes";
import {
  publicBrandRoutes,
  type PublicBrandRoutesOptions,
} from "./public-brands.routes";
import {
  publicCatalogRoutes,
  type PublicCatalogRoutesOptions,
} from "./public-catalog.routes";
import { variantsRoutes, type VariantRoutesOptions } from "./variants.routes";
export { serverRouteGroups } from "./route-groups";

export type ServerRoutesOptions = {
  accountRecovery?: AccountRecoveryRoutesOptions;
  adminAccounts?: AdminAccountRoutesOptions;
  auth?: AuthRoutesOptions;
  brands?: BrandRoutesOptions;
  categories?: CategoryRoutesOptions;
  customers?: CustomerRoutesOptions;
  googleOAuth?: GoogleOAuthRoutesOptions;
  images?: ImageRoutesOptions;
  inventory?: InventoryRoutesOptions;
  ownerGovernance?: OwnerGovernanceRoutesOptions;
  products?: ProductRoutesOptions;
  publicBrands?: PublicBrandRoutesOptions;
  publicCatalog?: PublicCatalogRoutesOptions;
  snapshots?: SnapshotRoutesOptions;
  variants?: VariantRoutesOptions;
};

export function serverRoutes(
  app: AnyElysia,
  options: ServerRoutesOptions = {}
) {
  return app
    .use(foundationRoutes)
    .use((routes) => authRoutes(routes, options.auth))
    .use((routes) => googleOAuthRoutes(routes, options.googleOAuth))
    .use((routes) => accountRecoveryRoutes(routes, options.accountRecovery))
    .use((routes) => customerRoutes(routes, options.customers))
    .use((routes) => adminAccountRoutes(routes, options.adminAccounts))
    .use((routes) => ownerGovernanceRoutes(routes, options.ownerGovernance))
    .use((routes) => brandsRoutes(routes, options.brands))
    .use((routes) => categoriesRoutes(routes, options.categories))
    .use((routes) => productsRoutes(routes, options.products))
    .use((routes) => imagesRoutes(routes, options.images))
    .use((routes) => variantsRoutes(routes, options.variants))
    .use((routes) => inventoryRoutes(routes, options.inventory))
    .use((routes) => publicBrandRoutes(routes, options.publicBrands))
    .use((routes) => publicCatalogRoutes(routes, options.publicCatalog))
    .use((routes) => snapshotsRoutes(routes, options.snapshots));
}
