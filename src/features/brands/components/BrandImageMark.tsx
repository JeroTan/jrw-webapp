import * as React from "react";
import { mergeClassNames } from "@/components/utils";

type BrandImageMarkSize = "sm" | "md" | "lg";

type BrandImageMarkProps = {
  imageAlt?: string | null;
  imageSrc?: string | null;
  name: string;
  size?: BrandImageMarkSize;
};

const sizeClassBySize: Record<BrandImageMarkSize, string> = {
  sm: "size-10 text-[0.95rem]",
  md: "size-14 text-[1.25rem]",
  lg: "size-24 text-[2rem]",
};

export function brandInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BR"
  );
}

export function BrandImageMark({
  imageAlt,
  imageSrc,
  name,
  size = "md",
}: BrandImageMarkProps) {
  const className = mergeClassNames(
    "grid shrink-0 place-items-center border border-brand-border-strong bg-brand-background font-identity font-black text-brand-content",
    sizeClassBySize[size]
  );

  if (imageSrc) {
    return (
      <div className={mergeClassNames(className, "overflow-hidden")}>
        <img
          alt={imageAlt ?? name}
          className="h-full w-full object-cover"
          loading="lazy"
          src={imageSrc}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`${name} brand image placeholder`}
      className={className}
      role="img"
    >
      {brandInitials(name)}
    </div>
  );
}
