import type { SampleService } from "@/domain/services/SampleService";
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
      data: "Sample response from controller",
      message: `${this.sampleService.doSomething()} You accessed the URL: ${urlData.pathname} and does you have a cookie? ${astroCookies.has("sample_cookie") ? "Yes!" : "No!"}`,
      code: "SUCCESS" as const,
    });
  }

  async handleSampleForm({ body }: { body: { field: string } }) {
    return Response.json({
      data: `You submitted: ${body.field}`,
      message: "This is a response from the form submission endpoint.",
      code: "SUCCESS" as const,
    });
  }

  async handleSampleQuery({ search }: { search: string }) {
    return Response.json({
      data: `You searched for: ${search}`,
      message: "This is a response from the query endpoint.",
      code: "SUCCESS" as const,
    });
  }
}
