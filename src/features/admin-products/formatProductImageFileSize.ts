export function formatProductImageFileSize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1) {
    return Number.isInteger(megabytes)
      ? `${megabytes.toFixed(0)}MB`
      : `${megabytes.toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}
