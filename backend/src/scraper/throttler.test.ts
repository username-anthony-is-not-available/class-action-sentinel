import { describe, it, expect } from "vitest";
import { Throttler } from "./throttler.js";

describe("Throttler", () => {
  it("should adjust delay on 429", () => {
    const throttler = new Throttler(2000, 1000, 30000);
    throttler.adjust(429, 100);
    expect(throttler.getCurrentDelay()).toBe(4000);
  });

  it("should increase delay on slow response", () => {
    const throttler = new Throttler(2000, 1000, 30000);
    throttler.adjust(200, 6000);
    expect(throttler.getCurrentDelay()).toBe(2400);
  });

  it("should decrease delay on fast response", () => {
    const throttler = new Throttler(2000, 1000, 30000);
    throttler.adjust(200, 500);
    expect(throttler.getCurrentDelay()).toBe(1800);
  });

  it("should stay within bounds", () => {
    const throttler = new Throttler(1000, 1000, 30000);
    throttler.adjust(200, 100);
    expect(throttler.getCurrentDelay()).toBe(1000);

    const maxThrottler = new Throttler(30000, 1000, 30000);
    maxThrottler.adjust(429, 100);
    expect(maxThrottler.getCurrentDelay()).toBe(30000);
  });
});
