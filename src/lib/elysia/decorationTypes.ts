import type { AstroCookies } from "astro";
import Elysia from "elysia";

export type AstroBridgeDecorations = {
  urlData?: URL;
  astroCookies?: AstroCookies;
  runtimeEnv?: Partial<Env> & Record<string, unknown>;
};

export const typedUrlData = new Elysia({ name: "typed-url-data" }).decorate(
  "urlData",
  undefined as URL | undefined,
);

export const typedAstroCookies = new Elysia({ name: "typed-astro-cookies" }).decorate(
  "astroCookies",
  undefined as AstroCookies | undefined,
);
