import { describe, expect, it, vi } from "vitest";
import { createMiddlewarePipeline, matchPathPattern } from "@/lib/middleware";
import type { MiddlewareHandler } from "./types";

describe("middleware pipeline", () => {
  it("returns undefined when matching handlers continue", async () => {
    const handler = vi.fn(() => undefined);
    const pipeline = createMiddlewarePipeline().route("/admin").use(handler);

    const result = await pipeline.run({
      request: new Request("https://jrw.test/admin"),
    });

    expect(result).toBeUndefined();
    expect(handler).toHaveBeenCalledOnce();
  });

  it("returns a response and stops remaining handlers", async () => {
    const first = vi.fn(() => new Response("blocked", { status: 403 }));
    const second = vi.fn(() => new Response("late"));
    const pipeline = createMiddlewarePipeline().route("/admin").use(first, second);

    const result = await pipeline.run({
      request: new Request("https://jrw.test/admin"),
    });

    expect(await result?.text()).toBe("blocked");
    expect(result?.status).toBe(403);
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });

  it("skips a route when method filter does not match", async () => {
    const handler = vi.fn(() => new Response("created"));
    const pipeline = createMiddlewarePipeline()
      .route("/checkout")
      .methods("POST")
      .use(handler);

    const result = await pipeline.run({
      request: new Request("https://jrw.test/checkout", { method: "GET" }),
    });

    expect(result).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
  });

  it("continues through later matching route blocks", async () => {
    const first = vi.fn(() => undefined);
    const second = vi.fn(() => new Response("second"));
    const pipeline = createMiddlewarePipeline()
      .route("/orders/:id")
      .use(first)
      .route("/orders/**")
      .use(second);

    const result = await pipeline.run({
      request: new Request("https://jrw.test/orders/order_123"),
    });

    expect(await result?.text()).toBe("second");
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it("passes named params, url, request, and context to handlers", async () => {
    const handler = vi.fn<MiddlewareHandler<{ role: string }>>(() => undefined);
    const pipeline = createMiddlewarePipeline<{ role: string }>()
      .route("/users/:id")
      .use(handler);
    const request = new Request("https://jrw.test/users/user%201?tab=profile");

    await pipeline.run({
      request,
      context: { role: "admin" },
    });

    expect(handler).toHaveBeenCalledWith({
      request,
      url: new URL(request.url),
      params: { id: "user 1" },
      context: { role: "admin" },
    });
  });

  it("propagates handler errors to the caller", async () => {
    const failure = new Error("middleware failed");
    const pipeline = createMiddlewarePipeline()
      .route("/admin")
      .use(() => {
        throw failure;
      });

    await expect(
      pipeline.run({
        request: new Request("https://jrw.test/admin"),
      }),
    ).rejects.toThrow(failure);
  });

  it("fails fast for invalid route patterns during registration", () => {
    expect(() => createMiddlewarePipeline().route("admin")).toThrow(
      'Middleware route pattern must start with "/": admin',
    );
  });
});

describe("path pattern matching", () => {
  it("matches static, named, wildcard, and deep wildcard patterns", () => {
    expect(matchPathPattern("/admin", "/admin")?.params).toEqual({});
    expect(matchPathPattern("/orders/:id", "/orders/order_123")?.params).toEqual({
      id: "order_123",
    });
    expect(matchPathPattern("/assets/*", "/assets/logo.png")?.params).toEqual({});
    expect(matchPathPattern("/admin/**", "/admin/users/edit")?.params).toEqual({});
  });

  it("does not match unrelated paths or single wildcards across segments", () => {
    expect(matchPathPattern("/admin", "/admin/users")).toBeUndefined();
    expect(matchPathPattern("/assets/*", "/assets/icons/logo.png")).toBeUndefined();
    expect(matchPathPattern("/orders/:id/edit", "/orders/order_123")).toBeUndefined();
  });

  it("fails fast for invalid patterns", () => {
    expect(() => matchPathPattern("", "/admin")).toThrow(
      "Middleware route pattern must not be empty.",
    );
    expect(() => matchPathPattern("admin", "/admin")).toThrow(
      'Middleware route pattern must start with "/": admin',
    );
    expect(() => matchPathPattern("/users/:", "/users/1")).toThrow(
      "Middleware route parameter name must not be empty.",
    );
  });
});
