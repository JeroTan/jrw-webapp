import * as React from "react";
import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { fetchBrandList } from "../api";
import type { BrandRecord } from "../types";

type ProductBrandFieldProps = {
  autoLoadBrands?: boolean;
  brands?: BrandRecord[];
  disabled?: boolean;
  error?: string;
  id?: string;
  label?: string;
  name?: string;
  onChange: (brandId: string | null) => void;
  required?: boolean;
  value: string | null;
};

const helperText =
  "Choose a brand when this product belongs in a catalog group. No brand is valid.";

export function ProductBrandField({
  autoLoadBrands = true,
  brands,
  disabled = false,
  error,
  id = "product-brand",
  label = "Brand",
  name = "brandId",
  onChange,
  required = false,
  value,
}: ProductBrandFieldProps) {
  const [loadedBrands, setLoadedBrands] = useState<BrandRecord[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!autoLoadBrands || brands) {
      return;
    }

    let active = true;
    fetchBrandList()
      .then((result) => {
        if (!active) return;
        setLoadedBrands(result.items);
      })
      .catch(() => {
        if (!active) return;
        setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, [autoLoadBrands, brands]);

  const options = brands ?? loadedBrands;
  const description = loadFailed
    ? `${helperText} Brand options could not load.`
    : helperText;

  return (
    <Select
      description={description}
      disabled={disabled}
      error={error}
      id={id}
      label={label}
      name={name}
      onChange={(event) => {
        const selected = event.currentTarget.value.trim();
        onChange(selected.length > 0 ? selected : null);
      }}
      required={required}
      value={value ?? ""}
    >
      <option value="">No brand (brandless)</option>
      {options.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </Select>
  );
}
