# Layouts and Theming

- **CLEANUP**: After initializing the Astro project, remove all default files in `src/layouts` and `src/pages` (except for the Elysia API routes) to keep the project clean and ready for development.

- Setup `src/features/theme/ThemeScript.astro` for dark mode logic:
  ```html
  <script is:inline>
    const getThemePreference = () => {
      if (
        typeof localStorage !== "undefined" &&
        localStorage.getItem("theme")
      ) {
        return localStorage.getItem("theme");
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };
    const isDark = getThemePreference() === "dark";
    document.documentElement.classList[isDark ? "add" : "remove"]("dark");

    if (typeof localStorage !== "undefined") {
      const observer = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  </script>
  ```
- Setup `src/layouts/Layout.astro`:
  ```html
  ---
  import "@/styles/globals.css";
  import { getLangFromUrl } from "@/i18/utils";
  import type { HTMLAttributes } from "astro/types";
  import ThemeScript from "@/features/theme/ThemeScript.astro";
  interface Props { title: string; html: HTMLAttributes<"html">; }
  const { title, html } = Astro.props;
  const currentLang = getLangFromUrl(Astro.url);
  ---

  <!doctype html>
  <html lang="{currentLang}" {...html}>
    <head>
      <meta name="application-name" content="Sample" />
      <title>{title}</title>
      <meta content="text/html;charset=utf-8" http-equiv="Content-Type" />
      <meta charset="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=0"
      />
      <link rel="icon" type="image/ico" href="/images/logo.png" />
      <link rel="sitemap" href="/sitemap-index.xml" />
      <meta name="robots" content="index, follow" />
      <meta name="theme-color" content="#ffffff" />
      <slot name="head-last" />
    </head>
    <body>
      <slot />
      <ThemeScript />
    </body>
  </html>
  ```
- In `src/styles/globals.css`, make sure to `@import "tailwindcss";`.
- Create `src/pages/index.astro` using the layout:
  ```html
  ---
  import Layout from "@/layouts/Layout.astro";
  ---

  <Layout title="Hello World" html="{{}}">
    <h1>Hello World</h1>
  </Layout>
  ```
