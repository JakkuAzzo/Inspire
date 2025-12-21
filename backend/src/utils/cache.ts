export interface CacheMetrics {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
}

export class LruCache<K, V> {
  private store = new Map<K, { value: V; expiresAt?: number }>();
  private hits = 0;
  private misses = 0;

  constructor(private maxSize: number = 50) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : undefined });
  }

  metrics(): CacheMetrics {
    return { size: this.store.size, maxSize: this.maxSize, hits: this.hits, misses: this.misses };
  }

  clear(): void {
    this.store.clear();
  }
}
