import { assertValidPathPattern, matchPathPattern } from "./patterns";
import type {
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewarePipeline,
  MiddlewareRouteBuilder,
  MiddlewareRouteConfig,
  MiddlewareRunOptions,
} from "./types";

interface MutableRouteConfig<TContext extends MiddlewareContext> {
  pattern: string;
  methods?: readonly string[];
  handlers: readonly MiddlewareHandler<TContext>[];
}

export function createMiddlewarePipeline<
  TContext extends MiddlewareContext = MiddlewareContext,
>(): MiddlewarePipeline<TContext> {
  return new MiddlewarePipelineBuilder<TContext>();
}

class MiddlewarePipelineBuilder<TContext extends MiddlewareContext>
  implements MiddlewarePipeline<TContext>
{
  private readonly routeConfigs: MutableRouteConfig<TContext>[] = [];

  route(pattern: string): MiddlewareRouteBuilder<TContext> {
    assertValidPathPattern(pattern);

    return new RouteBuilder<TContext>(this, pattern);
  }

  addRoute(route: MutableRouteConfig<TContext>): MiddlewarePipeline<TContext> {
    this.routeConfigs.push({
      pattern: route.pattern,
      methods: route.methods === undefined ? undefined : [...route.methods],
      handlers: [...route.handlers],
    });

    return this;
  }

  async run(options: MiddlewareRunOptions<TContext>): Promise<Response | undefined> {
    const url = options.url ?? new URL(options.request.url);
    const context = options.context ?? ({} as TContext);
    const requestMethod = options.request.method.toUpperCase();

    for (const route of this.routeConfigs) {
      if (!methodMatches(route.methods, requestMethod)) {
        continue;
      }

      const match = matchPathPattern(route.pattern, url.pathname);

      if (match === undefined) {
        continue;
      }

      for (const handler of route.handlers) {
        const result = await handler({
          request: options.request,
          url,
          params: match.params,
          context,
        });

        if (result instanceof Response) {
          return result;
        }
      }
    }

    return undefined;
  }

  routes(): readonly MiddlewareRouteConfig<TContext>[] {
    return this.routeConfigs.map((route) => ({
      pattern: route.pattern,
      methods: route.methods === undefined ? undefined : [...route.methods],
      handlers: [...route.handlers],
    }));
  }
}

class RouteBuilder<TContext extends MiddlewareContext>
  implements MiddlewareRouteBuilder<TContext>
{
  private routeMethods: readonly string[] | undefined;

  constructor(
    private readonly pipeline: MiddlewarePipelineBuilder<TContext>,
    private readonly pattern: string,
  ) {}

  methods(...methods: readonly string[]): MiddlewareRouteBuilder<TContext> {
    if (methods.length === 0) {
      throw new Error("Middleware route methods must not be empty.");
    }

    this.routeMethods = methods.map((method) => normalizeMethod(method));

    return this;
  }

  use(...handlers: readonly MiddlewareHandler<TContext>[]): MiddlewarePipeline<TContext> {
    if (handlers.length === 0) {
      throw new Error("Middleware route must include at least one handler.");
    }

    return this.pipeline.addRoute({
      pattern: this.pattern,
      methods: this.routeMethods,
      handlers,
    });
  }
}

function methodMatches(methods: readonly string[] | undefined, requestMethod: string): boolean {
  if (methods === undefined) {
    return true;
  }

  return methods.includes(requestMethod);
}

function normalizeMethod(method: string): string {
  const normalized = method.trim().toUpperCase();

  if (normalized.length === 0) {
    throw new Error("Middleware route method must not be empty.");
  }

  return normalized;
}
