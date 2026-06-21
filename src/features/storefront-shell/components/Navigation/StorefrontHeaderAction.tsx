import * as React from "react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui";

export function StorefrontHeaderAction(props: ComponentProps<typeof Button>) {
  return <Button paddingX="xs" size="md" textSize="xs" {...props} />;
}
