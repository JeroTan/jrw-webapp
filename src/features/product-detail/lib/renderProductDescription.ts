import showdown from "showdown";

const converter = new showdown.Converter({
  ghCodeBlocks: true,
  headerLevelStart: 2,
  noHeaderId: true,
  simpleLineBreaks: false,
  strikethrough: true,
  tables: true,
});

const urlAttributePattern = /\s(href|src)="([^"]*)"/gi;
const eventAttributePattern = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

function escapeRawHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isSafeUrl(value: string): boolean {
  const cleanValue = value.trim().toLowerCase();

  return (
    cleanValue.startsWith("/") ||
    cleanValue.startsWith("#") ||
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("mailto:") ||
    cleanValue.startsWith("tel:")
  );
}

function neutralizeUnsafeUrls(html: string): string {
  return html.replace(urlAttributePattern, (_match, attribute, value) =>
    isSafeUrl(value) ? ` ${attribute}="${value}"` : ` ${attribute}="#"`
  );
}

export function renderProductDescription(markdown: string): string {
  const escapedMarkdown = escapeRawHtml(markdown);
  const html = converter.makeHtml(escapedMarkdown);

  return neutralizeUnsafeUrls(html).replace(eventAttributePattern, "");
}
