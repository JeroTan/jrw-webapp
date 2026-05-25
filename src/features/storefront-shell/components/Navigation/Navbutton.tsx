import { type PropsWithChildren } from "react";

export function NavButton({
  href,
  children,
  active = false,
  dividerDirection = "vertical",
  singleBorder = false,
}: PropsWithChildren<{
  href: string;
  active?: boolean;
  dividerDirection?: "horizontal" | "vertical";
  singleBorder?: boolean;
}>) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      data-nav-button
      data-divider-direction={dividerDirection}
      className={`
        w-full md:h-full h-auto py-2 px-4
        inline-flex items-center
        font-system text-sm uppercase no-underline wrap-anywhere
        border-brand-border

        ${
          singleBorder
            ? dividerDirection === "horizontal"
              ? "border-t"
              : "border-l"
            : dividerDirection === "horizontal"
              ? "border-y"
              : "border-x"
        }

        ${
          active
            ? "bg-brand-accent text-brand-surface"
            : "text-brand-content hover:bg-brand-accent hover:text-brand-surface focus-visible:bg-brand-accent focus-visible:text-brand-surface"
        }

        motion-safe:transition-colors motion-safe:duration-120
      `}
      href={href}
    >
      {children}
    </a>
  );
}
