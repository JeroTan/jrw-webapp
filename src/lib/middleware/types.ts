export type MiddlewareParams = Readonly<Record<string, string>>;

export type MiddlewareContext = Record<string, unknown>;

export type MiddlewareResult = Response | void | undefined;

export type MaybePromise<T> = T | Promise<T>;

export interface MiddlewareInvocation<
  TContext extends MiddlewareContext = MiddlewareContext,
> {
  request: Request;
  url: URL;
  params: MiddlewareParams;
  context: TContext;
}

export type MiddlewareHandler<
  TContext extends MiddlewareContext = MiddlewareContext,
> = (invocation: MiddlewareInvocation<TContext>) => MaybePromise<MiddlewareResult>;

export interface MiddlewareRouteConfig<
  TContext extends MiddlewareContext = MiddlewareContext,
> {
  pattern: string;
  methods?: readonly string[];
  handlers: readonly MiddlewareHandler<TContext>[];
}

export interface MiddlewareRunOptions<
  TContext extends MiddlewareContext = MiddlewareContext,
> {
  request: Request;
  context?: TContext;
  url?: URL;
}

export interface MiddlewarePipeline<
  TContext extends MiddlewareContext = MiddlewareContext,
> {
  route(pattern: string): MiddlewareRouteBuilder<TContext>;
  run(options: MiddlewareRunOptions<TContext>): Promise<Response | undefined>;
  routes(): readonly MiddlewareRouteConfig<TContext>[];
}

export interface MiddlewareRouteBuilder<
  TContext extends MiddlewareContext = MiddlewareContext,
> {
  methods(...methods: readonly string[]): MiddlewareRouteBuilder<TContext>;
  use(...handlers: readonly MiddlewareHandler<TContext>[]): MiddlewarePipeline<TContext>;
}
