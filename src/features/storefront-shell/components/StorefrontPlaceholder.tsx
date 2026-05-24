import type { StorefrontPlaceholderLink } from "../types";

type StorefrontPlaceholderProps = {
  copy: string;
  kicker: string;
  links: StorefrontPlaceholderLink[];
  title: string;
  titleId: string;
};

export function StorefrontPlaceholder({
  copy,
  kicker,
  links,
  title,
  titleId,
}: StorefrontPlaceholderProps) {
  const hasMultipleLinks = links.length > 1;

  return (
    <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md" aria-labelledby={titleId}>
      <p className="font-system text-xs font-bold uppercase text-brand-muted">{kicker}</p>
      <h1 className="text-[clamp(1.8rem,6vw,3rem)] [overflow-wrap:anywhere]" id={titleId}>
        {title}
      </h1>
      <p className="max-w-[68ch] text-brand-muted">{copy}</p>
      <div className={hasMultipleLinks ? "flex flex-wrap gap-grid-xs" : undefined}>
        {links.map((link) => (
          <a className="inline-flex min-h-control-md w-fit items-center justify-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent motion-safe:transition-colors motion-safe:duration-[120ms]" href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export default StorefrontPlaceholder;
