import { describe, expect, it } from "vitest";
import { renderProductDescription } from "./renderProductDescription";

describe("renderProductDescription", () => {
  it("converts markdown into product description HTML", () => {
    const html = renderProductDescription(
      "## Fit notes\n\nLightweight **linen** shirt.\n\n- Relaxed cut"
    );

    expect(html).toContain("<h3>Fit notes</h3>");
    expect(html).toContain("<strong>linen</strong>");
    expect(html).toContain("<li>Relaxed cut</li>");
  });

  it("keeps unsafe HTML and script URLs inert", () => {
    const html = renderProductDescription(
      "Hello <script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))"
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="#"');
  });
});
