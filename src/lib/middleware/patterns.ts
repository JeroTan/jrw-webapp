import type { MiddlewareParams } from "./types";

export interface PatternMatch {
  params: MiddlewareParams;
}

type PatternSegment =
  | { kind: "static"; value: string }
  | { kind: "named"; name: string }
  | { kind: "wildcard" }
  | { kind: "deepWildcard" };

interface CompiledPattern {
  segments: readonly PatternSegment[];
}

export function matchPathPattern(pattern: string, pathname: string): PatternMatch | undefined {
  const compiled = compilePathPattern(pattern);
  const pathSegments = splitPath(pathname);
  const params: Record<string, string> = {};

  if (matchSegments(compiled.segments, pathSegments, params)) {
    return { params };
  }

  return undefined;
}

export function assertValidPathPattern(pattern: string): void {
  compilePathPattern(pattern);
}

function compilePathPattern(pattern: string): CompiledPattern {
  const normalized = normalizePattern(pattern);
  const segments = splitPath(normalized).map(parsePatternSegment);

  return { segments };
}

function normalizePattern(pattern: string): string {
  if (pattern.trim().length === 0) {
    throw new Error("Middleware route pattern must not be empty.");
  }

  if (!pattern.startsWith("/")) {
    throw new Error(`Middleware route pattern must start with "/": ${pattern}`);
  }

  return normalizePath(pattern);
}

function normalizePath(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/u, "");
}

function splitPath(pathname: string): readonly string[] {
  const normalized = normalizePath(pathname);

  if (normalized === "/") {
    return [];
  }

  return normalized.slice(1).split("/");
}

function parsePatternSegment(segment: string): PatternSegment {
  if (segment === "**") {
    return { kind: "deepWildcard" };
  }

  if (segment === "*") {
    return { kind: "wildcard" };
  }

  if (segment.startsWith(":")) {
    const name = segment.slice(1);

    if (name.length === 0) {
      throw new Error("Middleware route parameter name must not be empty.");
    }

    return { kind: "named", name };
  }

  return { kind: "static", value: segment };
}

function matchSegments(
  patternSegments: readonly PatternSegment[],
  pathSegments: readonly string[],
  params: Record<string, string>,
): boolean {
  return matchFrom(patternSegments, pathSegments, 0, 0, params);
}

function matchFrom(
  patternSegments: readonly PatternSegment[],
  pathSegments: readonly string[],
  patternIndex: number,
  pathIndex: number,
  params: Record<string, string>,
): boolean {
  if (patternIndex === patternSegments.length) {
    return pathIndex === pathSegments.length;
  }

  const segment = patternSegments[patternIndex];

  if (segment.kind === "deepWildcard") {
    if (patternIndex === patternSegments.length - 1) {
      return true;
    }

    for (let nextPathIndex = pathIndex; nextPathIndex <= pathSegments.length; nextPathIndex += 1) {
      if (matchFrom(patternSegments, pathSegments, patternIndex + 1, nextPathIndex, params)) {
        return true;
      }
    }

    return false;
  }

  const pathSegment = pathSegments[pathIndex];

  if (pathSegment === undefined) {
    return false;
  }

  if (segment.kind === "wildcard") {
    return matchFrom(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, params);
  }

  if (segment.kind === "named") {
    const previousValue = params[segment.name];
    params[segment.name] = decodePathSegment(pathSegment);

    if (matchFrom(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, params)) {
      return true;
    }

    if (previousValue === undefined) {
      delete params[segment.name];
    } else {
      params[segment.name] = previousValue;
    }

    return false;
  }

  if (segment.value !== pathSegment) {
    return false;
  }

  return matchFrom(patternSegments, pathSegments, patternIndex + 1, pathIndex + 1, params);
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
