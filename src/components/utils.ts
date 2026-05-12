export function mergeClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

export function mergeIds(...ids: Array<string | false | null | undefined>) {
  const merged = ids.filter(Boolean).join(" ");
  return merged.length > 0 ? merged : undefined;
}
