import { describe, it, expect, beforeEach } from "vitest";
import { ProxyManager } from "./proxyManager.js";

describe("ProxyManager", () => {
  beforeEach(() => {
    delete process.env.PROXY_LIST;
  });

  it("should return undefined when no proxies are configured", () => {
    const manager = new ProxyManager();
    expect(manager.getNextProxy()).toBeUndefined();
    expect(manager.hasProxies()).toBe(false);
  });

  it("should load proxies from environment", () => {
    process.env.PROXY_LIST = JSON.stringify([
      { server: "http://proxy1:8080" },
      { server: "http://proxy2:8080" }
    ]);
    const manager = new ProxyManager();
    expect(manager.hasProxies()).toBe(true);
    expect(manager.getNextProxy()?.server).toBe("http://proxy1:8080");
    expect(manager.getNextProxy()?.server).toBe("http://proxy2:8080");
    expect(manager.getNextProxy()?.server).toBe("http://proxy1:8080"); // Rotation
  });

  it("should handle invalid JSON in PROXY_LIST", () => {
    process.env.PROXY_LIST = "invalid-json";
    const manager = new ProxyManager();
    expect(manager.hasProxies()).toBe(false);
  });
});
