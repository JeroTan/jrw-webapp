# Tech-Stack Blueprint: JRW Simple E-commerce

## 1. Core Languages & Frameworks
- **Framework**: AstroJS v6.x (Output: `server`).
- **Language**: TypeScript 5.x (Strict Mode).
- **Runtime**: Cloudflare Workers (`workerd`).

## 2. Infrastructure & Services
- **Inventory Concurrency**: Cloudflare Durable Objects (SQLite Backend).
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS).
- **Payment Gateway**: PayMongo API v1 (Payment Intent & Payment Method workflow).
- **Transactional Emails**: Resend API.

## 3. Libraries & Dependencies
- **UI Library**: React v19.x (Islands of interactivity).
- **API Engine**: ElysiaJS (Integrated natively into Astro routes).
- **Styling**: TailwindCSS v4.x (Customized for Technical Brutalism: 0px radius, 1px borders).
- **WYSIWYG Editor**: Toast UI Editor (Markdown-based product curation).

## 4. Rationale
- **Performance**: Astro v6 and Cloudflare Workers ensure sub-200ms TTFB (Time to First Byte).
- **Integrity**: Durable Objects provide the atomic locking needed to fulfill the "Zero Overselling" mandate.
- **Local Fit**: PayMongo is the leading gateway for the Philippine market (GCash/Maya/Cards).
- **Consistency**: Tailwind v4 ensures the "Technical Brutalist" aesthetic is strictly maintained across all components.
