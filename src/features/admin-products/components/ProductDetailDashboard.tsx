import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Skeleton, Toast } from "@/components/feedback";
import { Button } from "@/components/ui";
import {
  assignProductBrand,
  assignProductCategories,
  fetchAssignableBrands,
  fetchAssignableCategories,
  fetchProductDetail,
  fetchProductOrganization,
  updateProduct,
} from "../api";
import { productActionErrorMessage } from "../productActionErrorMessage";
import { productCanMutate } from "../productCanMutate";
import type {
  ProductAssignableBrand,
  ProductAssignableCategory,
  ProductOrganizationRecord,
  ProductRecord,
} from "../types";
import { ProductEditor, type ProductEditorSaveInput } from "./ProductEditor";

type LoadState = "loading" | "ready" | "failed";

type ToastState = {
  title: string;
  message: string;
  tone: "error" | "success" | "warning";
};

export type ProductDetailDashboardProps = {
  autoLoad?: boolean;
  initialAvailableBrands?: ProductAssignableBrand[];
  initialAvailableCategories?: ProductAssignableCategory[];
  initialLoadState?: LoadState;
  initialOrganization?: ProductOrganizationRecord | null;
  initialOrganizationReady?: boolean;
  initialOrganizationUnavailable?: boolean;
  initialProduct?: ProductRecord | null;
  initialBrandScopeKnown?: boolean;
  productId: string;
};

export function ProductDetailDashboard({
  autoLoad = true,
  initialAvailableBrands = [],
  initialAvailableCategories = [],
  initialBrandScopeKnown = false,
  initialLoadState = "loading",
  initialOrganization = null,
  initialOrganizationReady = false,
  initialOrganizationUnavailable = false,
  initialProduct = null,
  productId,
}: ProductDetailDashboardProps) {
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [product, setProduct] = useState<ProductRecord | null>(initialProduct);
  const [organization, setOrganization] =
    useState<ProductOrganizationRecord | null>(initialOrganization);
  const [organizationReady, setOrganizationReady] = useState(
    initialOrganizationReady
  );
  const [organizationUnavailable, setOrganizationUnavailable] = useState(
    initialOrganizationUnavailable
  );
  const [availableBrands, setAvailableBrands] = useState<
    ProductAssignableBrand[]
  >(initialAvailableBrands);
  const [availableCategories, setAvailableCategories] = useState<
    ProductAssignableCategory[]
  >(initialAvailableCategories);
  const [brandScopeKnown, setBrandScopeKnown] = useState(
    initialBrandScopeKnown
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    Promise.allSettled([
      fetchProductDetail(productId),
      fetchProductOrganization(productId),
      fetchAssignableBrands(),
      fetchAssignableCategories(),
    ])
      .then(
        ([
          productResult,
          organizationResult,
          brandsResult,
          categoriesResult,
        ]) => {
          if (!active) {
            return;
          }

          if (productResult.status !== "fulfilled") {
            setLoadState("failed");
            setProduct(null);
            setOrganization(null);
            setOrganizationReady(false);
            setOrganizationUnavailable(false);
            return;
          }

          setProduct(productResult.value);
          setLoadState("ready");

          if (organizationResult.status === "fulfilled") {
            setOrganization(organizationResult.value);
            setOrganizationReady(true);
            setOrganizationUnavailable(false);
          } else {
            setOrganization(null);
            setOrganizationReady(false);
            setOrganizationUnavailable(true);
          }

          if (brandsResult.status === "fulfilled") {
            setAvailableBrands(
              brandsResult.value.filter((brand) => brand.status === "ACTIVE")
            );
            setBrandScopeKnown(true);
          } else {
            setAvailableBrands([]);
            setBrandScopeKnown(false);
          }

          if (categoriesResult.status === "fulfilled") {
            setAvailableCategories(
              categoriesResult.value.filter(
                (category) => category.status === "ACTIVE"
              )
            );
          } else {
            setAvailableCategories([]);
          }
        }
      )
      .catch(() => {
        if (!active) {
          return;
        }

        setLoadState("failed");
        setProduct(null);
        setOrganization(null);
        setOrganizationReady(false);
        setOrganizationUnavailable(false);
      });

    return () => {
      active = false;
    };
  }, [autoLoad, productId]);

  const availableBrandIds = useMemo(
    () => new Set(availableBrands.map((brand) => brand.id)),
    [availableBrands]
  );
  const mutationState = product
    ? productCanMutate(product, availableBrandIds, brandScopeKnown)
    : { allowed: false, reason: "Product is not loaded." };

  async function handleSaveProduct(input: ProductEditorSaveInput) {
    if (!product) {
      return;
    }

    setSaving(true);
    try {
      let nextProduct = await updateProduct(product.id, input.identity);
      let nextOrganization = organization;

      if (input.organization.persist) {
        const brandMutation = await assignProductBrand(product.id, {
          brandId: input.organization.brandId,
        });
        nextProduct = brandMutation.product;
        nextOrganization = brandMutation.organization;

        const categoryMutation = await assignProductCategories(product.id, {
          categoryIds: input.organization.categoryIds,
        });
        nextProduct = categoryMutation.product;
        nextOrganization = categoryMutation.organization;
      }

      setProduct(nextProduct);
      setOrganization(nextOrganization);
      setOrganizationReady(Boolean(nextOrganization));
      setOrganizationUnavailable(false);
      setToast({
        tone: "success",
        title: "Product updated",
        message: "Product identity and organization changes are saved.",
      });
    } catch (error) {
      const message = productActionErrorMessage(
        error,
        "Product save failed. Try again."
      );
      setToast({
        tone: "error",
        title: "Save failed",
        message,
      });
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <section className="grid gap-grid-sm">
        <header className="border-b border-brand-border-strong py-grid-md pt-grid-lg">
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Catalog product
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Edit product</h1>
        </header>
        <div className="border border-brand-border-strong bg-brand-surface p-grid-sm">
          <Skeleton label="Loading product detail" lines={7} />
        </div>
      </section>
    );
  }

  if (loadState === "failed" || !product) {
    return (
      <EmptyState
        action={
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            size="sm"
          >
            Retry
          </Button>
        }
        message="Could not load product detail. Retry with an active admin session."
        title="Product detail unavailable"
      />
    );
  }

  return (
    <>
      <ProductEditor
        availableBrands={availableBrands}
        availableCategories={availableCategories}
        closeLabel="Back to products"
        mode="edit"
        mutationBlockReason={mutationState.reason}
        mutationsBlocked={!mutationState.allowed}
        onClose={() => {
          if (typeof window !== "undefined") {
            window.location.assign("/admin/products");
          }
        }}
        onProductStatusChange={(nextProduct, operation) => {
          setProduct(nextProduct);
          setToast({
            tone: "success",
            title: "Status updated",
            message:
              operation === "publish"
                ? "Product published and visible to storefront queries."
                : operation === "unpublish"
                  ? "Product moved to draft and hidden from storefront queries."
                  : "Product archived with historical references preserved.",
          });
        }}
        onSave={handleSaveProduct}
        open={true}
        organization={organization}
        organizationReady={organizationReady}
        organizationUnavailable={organizationUnavailable}
        product={product}
        saving={saving}
        surface="page"
      />

      {toast ? (
        <aside className="fixed bottom-grid-md right-grid-md z-[60] max-md:bottom-grid-sm max-md:left-grid-sm max-md:right-grid-sm">
          <Toast
            message={toast.message}
            onDismiss={() => setToast(null)}
            title={toast.title}
            tone={toast.tone}
          />
        </aside>
      ) : null}
    </>
  );
}
