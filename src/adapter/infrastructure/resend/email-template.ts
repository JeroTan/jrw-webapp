export type EmailTemplateBlock = {
  html: string;
  text: string;
};

export type EmailTemplateDocument = {
  html: string;
  text: string;
};

const FRAME_STYLE =
  "margin:0;background:#fcf8f9;color:#0d1117;font-family:'Space Mono','Courier New',monospace;";
const SHELL_STYLE =
  "max-width:560px;margin:0 auto;padding:32px 20px;";
const PANEL_STYLE =
  "background:#ffffff;border:1px solid #0d1117;border-radius:0;padding:24px;";
const BRAND_STYLE =
  "font-family:'Space Mono','Courier New',monospace;font-size:12px;letter-spacing:0;text-transform:uppercase;color:#45474b;margin:0 0 24px;";
const TITLE_STYLE =
  "font-family:'Satoshi',Arial,sans-serif;font-size:24px;line-height:1.05;font-weight:700;letter-spacing:0;margin:0 0 16px;color:#0d1117;";
const BODY_STYLE =
  "font-family:'Space Mono','Courier New',monospace;font-size:14px;line-height:1.5;margin:0 0 16px;color:#45474b;";
const META_STYLE =
  "font-family:'Space Mono','Courier New',monospace;font-size:12px;line-height:1.5;margin:16px 0;color:#45474b;";
const BUTTON_STYLE =
  "display:inline-block;background:#3e96f4;color:#ffffff;border:1px solid #0d1117;border-radius:0;text-decoration:none;padding:12px 16px;font-family:'Space Mono','Courier New',monospace;font-weight:700;font-size:14px;line-height:1;margin:8px 0 18px;";
const LINK_STYLE =
  "font-family:'Space Mono','Courier New',monospace;font-size:12px;line-height:1.5;word-break:break-all;color:#3e96f4;margin:0 0 16px;";

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function emailTitle(input: { content: string }): EmailTemplateBlock {
  const content = input.content.trim();

  return {
    html: `<h1 style="${TITLE_STYLE}">${escapeEmailHtml(content)}</h1>`,
    text: content,
  };
}

export function emailBody(input: { content: string }): EmailTemplateBlock {
  const content = input.content.trim();

  return {
    html: `<p style="${BODY_STYLE}">${escapeEmailHtml(content)}</p>`,
    text: content,
  };
}

export function emailMeta(input: {
  label: string;
  value: string;
}): EmailTemplateBlock {
  const label = input.label.trim();
  const value = input.value.trim();

  return {
    html: `<p style="${META_STYLE}">${escapeEmailHtml(label)}: ${escapeEmailHtml(value)}</p>`,
    text: `${label}: ${value}`,
  };
}

export function emailActionLink(input: {
  label: string;
  url: string;
}): EmailTemplateBlock {
  const label = input.label.trim();
  const url = input.url.trim();
  const safeLabel = escapeEmailHtml(label);
  const safeUrl = escapeEmailHtml(url);

  return {
    html: [
      `<p><a style="${BUTTON_STYLE}" href="${safeUrl}">${safeLabel}</a></p>`,
      `<p style="${LINK_STYLE}">${safeUrl}</p>`,
    ].join(""),
    text: [label, url].join("\n"),
  };
}

export function emailFrame(input: {
  title: string;
  blocks: EmailTemplateBlock[];
}): EmailTemplateDocument {
  const title = input.title.trim();
  const html = [
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeEmailHtml(title)}</title></head>`,
    `<body style="${FRAME_STYLE}">`,
    `<div style="${SHELL_STYLE}">`,
    `<div style="${BRAND_STYLE}">JRW</div>`,
    `<div style="${PANEL_STYLE}">`,
    ...input.blocks.map((block) => block.html),
    "</div>",
    "</div>",
    "</body></html>",
  ].join("");
  const text = ["JRW", title, "", ...input.blocks.map((block) => block.text)]
    .filter((line) => line.length > 0)
    .join("\n\n");

  return { html, text };
}
