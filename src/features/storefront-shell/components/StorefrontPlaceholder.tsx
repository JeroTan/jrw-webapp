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
    <section className="jrw-storefront-placeholder" aria-labelledby={titleId}>
      <p className="jrw-storefront-kicker">{kicker}</p>
      <h1 className="jrw-storefront-placeholder__title" id={titleId}>
        {title}
      </h1>
      <p className="jrw-storefront-placeholder__copy">{copy}</p>
      <div className={hasMultipleLinks ? "jrw-storefront-inline-links" : undefined}>
        {links.map((link) => (
          <a className="jrw-storefront-link" href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </section>
  );
}

export default StorefrontPlaceholder;
