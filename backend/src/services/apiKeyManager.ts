interface ApiKeyRecord {
  key: string;
  backoffUntil?: number;
  rateLimitHits: number;
}

export class ApiKeyManager {
  private keys = new Map<string, ApiKeyRecord>();
  private baseBackoffMs = 2000;
  private maxBackoffMs = 30000;

  constructor(initialKeys: Record<string, string | undefined>) {
    Object.entries(initialKeys).forEach(([name, key]) => {
      if (key) {
        this.keys.set(name, { key, rateLimitHits: 0 });
      }
    });
  }

  getKey(name: string): string | undefined {
    const record = this.keys.get(name);
    if (!record) return undefined;
    if (record.backoffUntil && record.backoffUntil > Date.now()) {
      return undefined;
    }
    return record.key;
  }

  async waitIfRateLimited(name: string): Promise<void> {
    const record = this.keys.get(name);
    if (!record?.backoffUntil) return;
    const delay = Math.max(0, record.backoffUntil - Date.now());
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  markRateLimit(name: string): void {
    const record = this.keys.get(name);
    if (!record) return;
    record.rateLimitHits += 1;
    const delay = Math.min(this.baseBackoffMs * Math.pow(2, record.rateLimitHits - 1), this.maxBackoffMs);
    record.backoffUntil = Date.now() + delay;
  }

  metrics() {
    const metrics: Record<string, { rateLimitHits: number; backoffMs: number }> = {};
    this.keys.forEach((record, name) => {
      metrics[name] = {
        rateLimitHits: record.rateLimitHits,
        backoffMs: record.backoffUntil ? Math.max(0, record.backoffUntil - Date.now()) : 0
      };
    });
    return metrics;
  }
}
