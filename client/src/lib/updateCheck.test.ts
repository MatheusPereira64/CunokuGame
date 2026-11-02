import { describe, expect, it } from "vitest";
import { ReleaseCheckError, retryAtFromResponse, updateRetryDelayMs } from "./updateCheck";

const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

describe("nova tentativa da checagem de atualização", () => {
  it("usa o reinício do limite do GitHub", () => {
    const retryAt = retryAtFromResponse(403, headers({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "2000" }));
    expect(retryAt).toBe(2_000_000);
    expect(updateRetryDelayMs(new ReleaseCheckError("limite", retryAt), 1_900_000)).toBe(105_000);
  });

  it("não trata outro 403 como limite esgotado", () => {
    expect(retryAtFromResponse(403, headers({ "x-ratelimit-remaining": "12" }))).toBeNull();
    expect(retryAtFromResponse(500, headers({ "x-ratelimit-remaining": "0", "x-ratelimit-reset": "2000" }))).toBeNull();
  });

  it("espera 5 minutos em falhas comuns, como rede fora do ar", () => {
    expect(updateRetryDelayMs(new TypeError("Failed to fetch"))).toBe(300_000);
    expect(updateRetryDelayMs(new ReleaseCheckError("HTTP 500", null))).toBe(300_000);
  });

  it("limita a espera a 1 hora", () => {
    expect(updateRetryDelayMs(new ReleaseCheckError("limite", 10_000_000), 0)).toBe(3_600_000);
  });

  it("repete logo depois quando o limite já reiniciou", () => {
    expect(updateRetryDelayMs(new ReleaseCheckError("limite", 1_000), 5_000)).toBe(5_000);
  });
});
