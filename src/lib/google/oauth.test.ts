import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from "jose";
import { describe, expect, it } from "vitest";
import { hashGoogleOAuthMaterial } from "@/domain/auth/google-oauth";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from "./oauth";

const config = {
  clientId: "google-client-id.apps.googleusercontent.com",
  clientSecret: "google-client-secret",
  redirectUri: "https://jrw.test/api/oauth/google/callback",
};

describe("google oauth provider boundary", () => {
  it("builds web-server authorization URL with state and nonce", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        ...config,
        state: "raw-state",
        nonce: "raw-nonce",
      })
    );

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("access_type")).toBe("online");
    expect(url.searchParams.get("client_id")).toBe(config.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
    expect(url.searchParams.get("state")).toBe("raw-state");
    expect(url.searchParams.get("nonce")).toBe("raw-nonce");
  });

  it("exchanges callback code with form-urlencoded body and returns only ID token", async () => {
    const requests: Request[] = [];
    const result = await exchangeGoogleAuthorizationCode({
      ...config,
      code: "authorization-code",
      fetch: async (request) => {
        requests.push(request instanceof Request ? request : new Request(request));
        return Response.json({
          access_token: "ya29.raw-access-token",
          refresh_token: "raw-refresh-token",
          id_token: "raw-id-token",
        });
      },
    });

    expect(result).toMatchObject({ content: { idToken: "raw-id-token" } });
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toBe("https://oauth2.googleapis.com/token");
    expect(requests[0]?.headers.get("content-type")).toContain(
      "application/x-www-form-urlencoded"
    );
    await expect(requests[0]?.text()).resolves.toContain(
      "grant_type=authorization_code"
    );
    expect(JSON.stringify(result)).not.toContain("ya29.raw-access-token");
    expect(JSON.stringify(result)).not.toContain("raw-refresh-token");
  });

  it("maps token provider failures to safe provider-unavailable errors", async () => {
    const result = await exchangeGoogleAuthorizationCode({
      ...config,
      code: "authorization-code",
      fetch: async () =>
        Response.json(
          { error: "invalid_grant", error_description: "raw authorization-code" },
          { status: 400 }
        ),
    });

    expect(result).toMatchObject({
      error: { code: "PROVIDER_UNAVAILABLE" },
    });
    expect(JSON.stringify(result)).not.toContain("raw authorization-code");
  });

  it("verifies Google ID token claims and hashed nonce", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "kid1";
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const nonceHash = await hashGoogleOAuthMaterial("raw-nonce");
    const idToken = await new SignJWT({
      sub: "google-sub-1",
      email: "buyer@example.test",
      email_verified: true,
      nonce: "raw-nonce",
      name: "Buyer Example",
      given_name: "Buyer",
      family_name: "Example",
      picture: "https://example.test/avatar.png",
    })
      .setProtectedHeader({ alg: "RS256", kid: "kid1" })
      .setIssuer("https://accounts.google.com")
      .setAudience(config.clientId)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);

    const result = await verifyGoogleIdToken({
      idToken,
      clientId: config.clientId,
      expectedNonceHash: nonceHash,
      jwks,
    });

    expect(result).toMatchObject({
      content: {
        sub: "google-sub-1",
        email: "buyer@example.test",
        emailVerified: true,
        name: "Buyer Example",
      },
    });

    await expect(
      verifyGoogleIdToken({
        idToken,
        clientId: config.clientId,
        expectedNonceHash: await hashGoogleOAuthMaterial("other-nonce"),
        jwks,
      })
    ).resolves.toMatchObject({ error: { code: "AUTHENTICATION" } });
  });
});
