import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class CacheService {
  private cacheDir: string;
  private maxCacheSize: number = 100 * 1024 * 1024; // 100MB
  private cacheIndex: Map<string, CacheEntry> = new Map();

  constructor() {
    this.cacheDir = path.join(os.homedir(), '.bottleneck', 'cache');
    this.ensureCacheDir();
    this.loadCacheIndex();
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadCacheIndex() {
    const indexFile = path.join(this.cacheDir, 'index.json');
    if (fs.existsSync(indexFile)) {
      try {
        const data = fs.readFileSync(indexFile, 'utf8');
        const index = JSON.parse(data);
        this.cacheIndex = new Map(Object.entries(index));
      } catch (error) {
        console.error('Failed to load cache index:', error);
        this.cacheIndex = new Map();
      }
    }
  }

  private saveCacheIndex() {
    const indexFile = path.join(this.cacheDir, 'index.json');
    const index = Object.fromEntries(this.cacheIndex);
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }

  private getCacheFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.cache`);
  }

  private cleanupOldEntries() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [key, entry] of this.cacheIndex.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.remove(key);
      }
    }
  }

  private enforceMaxSize() {
    let totalSize = 0;
    const entries = Array.from(this.cacheIndex.entries());
    
    // Calculate total size
    for (const [key, entry] of entries) {
      totalSize += entry.size;
    }

    // If over limit, remove oldest entries
    if (totalSize > this.maxCacheSize) {
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (const [key, entry] of entries) {
        if (totalSize <= this.maxCacheSize) break;
        
        this.remove(key);
        totalSize -= entry.size;
      }
    }
  }

  public set(key: string, value: any, ttl?: number): void {
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');
    const filePath = this.getCacheFilePath(key);

    try {
      fs.writeFileSync(filePath, serialized);
      
      this.cacheIndex.set(key, {
        filePath,
        size,
        timestamp: Date.now(),
        ttl: ttl || 0
      });

      this.cleanupOldEntries();
      this.enforceMaxSize();
      this.saveCacheIndex();
    } catch (error) {
      console.error('Failed to cache value:', error);
    }
  }

  public get(key: string): any | null {
    const entry = this.cacheIndex.get(key);
    if (!entry) return null;

    // Check TTL
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.remove(key);
      return null;
    }

    try {
      if (fs.existsSync(entry.filePath)) {
        const data = fs.readFileSync(entry.filePath, 'utf8');
        return JSON.parse(data);
      } else {
        this.remove(key);
        return null;
      }
    } catch (error) {
      console.error('Failed to read cached value:', error);
      this.remove(key);
      return null;
    }
  }

  public has(key: string): boolean {
    const entry = this.cacheIndex.get(key);
    if (!entry) return false;

    // Check TTL
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.remove(key);
      return false;
    }

    return fs.existsSync(entry.filePath);
  }

  public remove(key: string): void {
    const entry = this.cacheIndex.get(key);
    if (entry) {
      try {
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
        }
      } catch (error) {
        console.error('Failed to remove cache file:', error);
      }
      this.cacheIndex.delete(key);
      this.saveCacheIndex();
    }
  }

  public clear(): void {
    for (const key of this.cacheIndex.keys()) {
      this.remove(key);
    }
  }

  public getStats(): { size: number; count: number; maxSize: number } {
    let totalSize = 0;
    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.size;
    }

    return {
      size: totalSize,
      count: this.cacheIndex.size,
      maxSize: this.maxCacheSize
    };
  }
}

interface CacheEntry {
  filePath: string;
  size: number;
  timestamp: number;
  ttl: number;
}