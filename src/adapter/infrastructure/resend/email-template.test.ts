import { describe, expect, it } from "vitest";
import {
  emailActionLink,
  emailBody,
  emailFrame,
  emailMeta,
  emailTitle,
} from "./email-template";

describe("email template helpers", () => {
  it("builds one shared JRW frame from composable title, body, meta, and link blocks", () => {
    const template = emailFrame({
      title: "Reset <Password>",
      blocks: [
        emailTitle({ content: "Reset <Password>" }),
        emailBody({ content: "Use this link & keep it private." }),
        emailActionLink({
          label: "Reset password",
          url: "https://jrw.test/reset-password?token=raw&unsafe=<x>",
        }),
        emailMeta({ label: "Expires at", value: "2026-05-15T00:30:00.000Z" }),
      ],
    });

    expect(template.html).toContain("background:#fcf8f9");
    expect(template.html).toContain(
      "font-family:'Space Mono','Courier New',monospace"
    );
    expect(template.html).toContain(
      "font-family:'Satoshi',Arial,sans-serif"
    );
    expect(template.html).toContain("border:1px solid #0d1117");
    expect(template.html).toContain("background:#3e96f4");
    expect(template.html).toContain("border-radius:0");
    expect(template.html).toContain("JRW");
    expect(template.html).toContain("Reset &lt;Password&gt;");
    expect(template.html).toContain("Use this link &amp; keep it private.");
    expect(template.html).toContain("raw&amp;unsafe=&lt;x&gt;");
    expect(template.text).toContain("Reset <Password>");
    expect(template.text).toContain("Use this link & keep it private.");
    expect(template.text).toContain("https://jrw.test/reset-password");
  });
});
