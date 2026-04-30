import type { SampleService } from "@/domain/services/SampleServices";
import type { AstroCookies } from "astro";

export class SampleController {
  constructor(public sampleService: SampleService) {}

  async handleSample({
    astroCookies,
    urlData,
  }: {
    astroCookies: AstroCookies;
    urlData: URL;
  }) {
    return Response.json({
      message: `${this.sampleService.doSomething()} You accessed the URL: ${urlData.pathname} and does you have a cookie? ${astroCookies.has("sample_cookie") ? "Yes!" : "No!"}`,
    });
  }
}
