export class Throttler {
  private currentDelay: number;
  private minDelay: number;
  private maxDelay: number;

  constructor(initialDelay = 2000, minDelay = 1000, maxDelay = 30000) {
    this.currentDelay = initialDelay;
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
  }

  async wait(): Promise<void> {
    const jitter = Math.random() * 1000;
    const delay = this.currentDelay + jitter;
    console.log(`[Throttler] Waiting for ${Math.round(delay)}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  adjust(statusCode: number, responseTimeMs: number): void {
    if (statusCode === 429) {
      // Too Many Requests - double the delay
      this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
      console.log(`[Throttler] 429 detected, increasing delay to ${this.currentDelay}ms`);
    } else if (statusCode >= 200 && statusCode < 300) {
      if (responseTimeMs > 5000) {
        // Slow response - increase delay
        this.currentDelay = Math.min(this.currentDelay * 1.2, this.maxDelay);
        console.log(`[Throttler] Slow response (${responseTimeMs}ms), increasing delay to ${Math.round(this.currentDelay)}ms`);
      } else if (responseTimeMs < 1000) {
        // Fast response - decrease delay slightly
        this.currentDelay = Math.max(this.currentDelay * 0.9, this.minDelay);
        console.log(`[Throttler] Fast response (${responseTimeMs}ms), decreasing delay to ${Math.round(this.currentDelay)}ms`);
      }
    }
  }

  getCurrentDelay(): number {
    return this.currentDelay;
  }
}
