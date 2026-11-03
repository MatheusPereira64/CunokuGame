import { describe, it, expect } from "vitest";
import {
  getAnimationDuration,
  generateAnimationId,
  DEFAULT_DURATIONS,
  type AnimationConfig, visibleCardCenter } from "./types";

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

describe("visibleCardCenter", () => {
  const card = { left: 100, right: 148, top: 10, bottom: 78 };

  it("usa o centro da carta inteira quando nada a cobre", () => {
    expect(visibleCardCenter(card)).toEqual({ x: 124, y: 44 });
    expect(visibleCardCenter(card, null)).toEqual({ x: 124, y: 44 });
  });

  it("usa a parte visível quando a carta seguinte cobre o resto", () => {
    expect(visibleCardCenter(card, { left: 124, right: 172, top: 10, bottom: 78 })).toEqual({ x: 112, y: 44 });
  });

  it("ignora vizinha que não sobrepõe a carta", () => {
    expect(visibleCardCenter(card, { left: 160, right: 208, top: 10, bottom: 78 }).x).toBe(124);
    expect(visibleCardCenter(card, { left: 40, right: 88, top: 10, bottom: 78 }).x).toBe(124);
  });
});
