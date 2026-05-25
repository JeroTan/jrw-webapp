import * as React from "react";

import { StorefrontHero } from "../StorefrontHero";
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
  return (
    <section aria-labelledby={titleId} className="grid gap-grid-sm">
      <StorefrontHero
        actions={links.map((link, index) => ({
          href: link.href,
          label: link.label,
          variant: index === 0 ? "primary" : "secondary",
        }))}
        copy={copy}
        id={titleId}
        kicker={kicker}
        title={title}
      />
    </section>
  );
}

export default StorefrontPlaceholder;
