import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizationUrl, decideLink, enabledProviders, getProvider, pkceChallenge } from "../src/lib/oauth";
import { safeNext } from "../src/lib/safe-next";

describe("decideLink (account linking)", () => {
  it("logs in a user already linked to this provider identity", () => {
    expect(decideLink({ linkedUserId: "u1", emailUser: null })).toEqual({ action: "login", userId: "u1" });
  });

  it("creates a new user when nobody has this email", () => {
    expect(decideLink({ linkedUserId: null, emailUser: null })).toEqual({ action: "create" });
  });

  it("links to an existing email account and REVOKES an unproven password (pre-account takeover)", () => {
    // Someone signed up with the victim's email + a password; the provider now proves ownership.
    expect(decideLink({ linkedUserId: null, emailUser: { id: "u2", hasPassword: true, linkedAccounts: 0 } })).toEqual({
      action: "link",
      userId: "u2",
      revokePassword: true,
    });
  });

  it("keeps the password once ownership was already proven by another provider", () => {
    expect(decideLink({ linkedUserId: null, emailUser: { id: "u3", hasPassword: true, linkedAccounts: 1 } })).toMatchObject({
      action: "link",
      revokePassword: false,
    });
  });
});

describe("PKCE (S256)", () => {
  it("equals BASE64URL(SHA256(verifier)), cross-checked with openssl", () => {
    // printf '%s' <verifier> | openssl dgst -sha256 -binary | openssl base64 -A | tr '+/' '-_' | tr -d '='
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r7wW1gFWFOEjXk")).toBe("bwWFMyPfdG9qreDhH2lmftFx_dFeLDalzcT1gb_j68g");
  });

  it("is 43 URL-safe characters with no padding, as RFC 7636 requires", () => {
    const c = pkceChallenge("any-verifier-value");
    expect(c).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("providers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("only enables providers with both client id and secret", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "gh-id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "gh-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "only-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(enabledProviders().map((p) => p.id)).toEqual(["github"]);
    expect(getProvider("google")).toBeNull();
    expect(getProvider("evil")).toBeNull();
  });

  it("builds an authorization URL with state, PKCE S256 and the exact redirect URI", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "gh-id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "gh-secret");
    const url = new URL(authorizationUrl(getProvider("github")!, { state: "st", verifier: "v".repeat(43), redirectUri: "https://app.test/api/auth/github/callback" }));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("state")).toBe("st");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/api/auth/github/callback");
    expect(url.searchParams.get("client_secret")).toBeNull(); // the secret never goes to the browser
  });
});

describe("safeNext (open-redirect guard)", () => {
  it("allows only same-site paths", () => {
    expect(safeNext("/dashboard/abc")).toBe("/dashboard/abc");
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", null, 42]) {
      expect(safeNext(bad)).toBe("/dashboard");
    }
  });
});
