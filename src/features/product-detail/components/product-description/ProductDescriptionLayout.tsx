import * as React from "react";
import type { ReactNode } from "react";

type ProductDescriptionLayoutProps = {
  children: ReactNode;
};

export function ProductDescriptionLayout({
  children,
}: ProductDescriptionLayoutProps) {
  return (
    <div className="grid gap-grid-sm text-brand-content [&_a]:font-bold [&_a]:text-brand-content [&_a]:underline [&_blockquote]:m-0 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-border [&_blockquote]:pl-grid-sm [&_code]:border [&_code]:border-brand-border [&_code]:bg-brand-background [&_code]:px-1 [&_h3]:m-0 [&_h3]:font-identity [&_h3]:text-[clamp(1.35rem,3vw,1.8rem)] [&_h4]:m-0 [&_h4]:font-identity [&_h4]:text-[1.15rem] [&_li]:pl-1 [&_ol]:m-0 [&_ol]:grid [&_ol]:gap-2 [&_ol]:pl-grid-md [&_p]:m-0 [&_strong]:font-extrabold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-brand-border [&_td]:p-2 [&_th]:border [&_th]:border-brand-border [&_th]:p-2 [&_ul]:m-0 [&_ul]:grid [&_ul]:gap-2 [&_ul]:pl-grid-md">
      {children}
    </div>
  );
}

export default ProductDescriptionLayout;
