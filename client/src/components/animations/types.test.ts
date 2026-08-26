import { describe, it, expect } from "vitest";
import {
  getAnimationDuration,
  generateAnimationId,
  DEFAULT_DURATIONS,
  type AnimationConfig,
} from "./types";

const baseConfig: AnimationConfig = {
  enabled: true,
  speed: "normal",
  reducedMotion: false,
  soundEnabled: true,
};

describe("getAnimationDuration", () => {
  it("aplica duração padrão e multiplicadores", () => {
    expect(getAnimationDuration("draw", baseConfig)).toBe(DEFAULT_DURATIONS.draw);
    expect(getAnimationDuration("draw", { ...baseConfig, speed: "fast" })).toBe(
      DEFAULT_DURATIONS.draw * 0.6
    );
    expect(getAnimationDuration("draw", { ...baseConfig, speed: "slow" })).toBe(
      DEFAULT_DURATIONS.draw * 1.5
    );
  });

  it("zera duração quando desabilitado ou reduced motion", () => {
    expect(getAnimationDuration("swap", { ...baseConfig, enabled: false })).toBe(0);
    expect(getAnimationDuration("swap", { ...baseConfig, reducedMotion: true })).toBe(0);
  });
});

describe("generateAnimationId", () => {
  it("gera ids únicos com prefixo anim_", () => {
    const a = generateAnimationId();
    const b = generateAnimationId();
    expect(a.startsWith("anim_")).toBe(true);
    expect(b.startsWith("anim_")).toBe(true);
    expect(a).not.toBe(b);
  });
});
