import * as React from "react";
import type { ComponentProps } from "react";

import { ButtonLink } from "@/components/ui";

export function StorefrontHeaderCta(props: ComponentProps<typeof ButtonLink>) {
  return <ButtonLink paddingX="xs" size="md" textSize="xs" {...props} />;
}
