export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;

  constructor() {
    this.loadFromEnv();
  }

  private loadFromEnv() {
    const proxyStr = process.env.PROXY_LIST;
    if (proxyStr) {
      try {
        const list = JSON.parse(proxyStr);
        if (Array.isArray(list)) {
          this.proxies = list;
          console.log(`[ProxyManager] Loaded ${this.proxies.length} proxies from ENV`);
        }
      } catch (err) {
        console.error("[ProxyManager] Failed to parse PROXY_LIST env:", err);
      }
    }
  }

  getNextProxy(): ProxyConfig | undefined {
    if (this.proxies.length === 0) return undefined;

    const proxy = this.proxies[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return proxy;
  }

  hasProxies(): boolean {
    return this.proxies.length > 0;
  }
}
