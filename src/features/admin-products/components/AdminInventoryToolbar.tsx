import * as React from "react";

import { PageToolbar } from "@/components/layout";
import { ButtonLink, SearchInput } from "@/components/ui";

export type AdminInventoryToolbarProps = {
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
};

export function AdminInventoryToolbar({
  onSearchQueryChange,
  searchQuery,
}: AdminInventoryToolbarProps) {
  return (
    <PageToolbar
      aria-label="Inventory controls"
      actions={
        <ButtonLink href="/admin/products" size="md" variant="secondary">
          Open products
        </ButtonLink>
      }
      main={
        <SearchInput
          label="Search inventory"
          onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          placeholder="Search product, variant, or SKU"
          value={searchQuery}
        />
      }
    />
  );
}
