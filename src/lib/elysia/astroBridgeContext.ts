import { Elysia } from "elysia";
import type { AstroBridgeDecorations } from "./decorationTypes";

const astroBridgeDecorationsByRequest = new WeakMap<Request, AstroBridgeDecorations>();

export function bindAstroBridgeDecorations(
  request: Request,
  decorations: AstroBridgeDecorations,
): void {
  astroBridgeDecorationsByRequest.set(request, decorations);
}

export function clearAstroBridgeDecorations(request: Request): void {
  astroBridgeDecorationsByRequest.delete(request);
}

export function getAstroBridgeDecorations(request: Request): AstroBridgeDecorations {
  return astroBridgeDecorationsByRequest.get(request) ?? { urlData: new URL(request.url) };
}

export const astroBridgeDecorations = new Elysia({ name: "astro-bridge-decorations" }).derive(
  { as: "scoped" },
  ({ request }) => getAstroBridgeDecorations(request),
);
