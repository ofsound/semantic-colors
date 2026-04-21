import type { BridgeSnapshot, OklchColor } from './types';

export type BridgeStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface BridgeClientOptions {
  getBaseUrl: () => string;
  onStatus: (status: BridgeStatus, detail?: string) => void;
  onSnapshot: (snapshot: BridgeSnapshot) => void;
}

export class BridgeClient {
  private source: EventSource | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 1000;
  private stopped = false;

  constructor(private readonly options: BridgeClientOptions) {}

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }

  async fetchSnapshot(): Promise<BridgeSnapshot> {
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/snapshot`, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Snapshot request failed with status ${response.status}`);
    }
    return (await response.json()) as BridgeSnapshot;
  }

  async pushOverride(
    tokenId: string,
    mode: 'light' | 'dark' | 'both',
    color: OklchColor,
    options: { persist?: boolean } = {}
  ): Promise<void> {
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tokenId, mode, color, persist: options.persist ?? false })
    });
    if (!response.ok) {
      throw new Error(`Override failed with status ${response.status}`);
    }
  }

  private connect(): void {
    if (this.stopped) return;
    this.options.onStatus('connecting');
    const url = `${this.options.getBaseUrl()}/api/bridge/events`;
    try {
      this.source = new EventSource(url);
    } catch (error) {
      this.options.onStatus('error', error instanceof Error ? error.message : 'Unable to connect');
      this.scheduleReconnect();
      return;
    }

    this.source.addEventListener('hello', (event) => {
      this.retryDelay = 1000;
      this.options.onStatus('connected');
      this.handleSnapshotEvent(event as MessageEvent<string>);
    });
    this.source.addEventListener('snapshot', (event) => {
      this.handleSnapshotEvent(event as MessageEvent<string>);
    });
    this.source.addEventListener('ping', () => {
      // keep-alive
    });
    this.source.onerror = () => {
      this.options.onStatus('error', 'Stream disconnected');
      this.source?.close();
      this.source = null;
      this.scheduleReconnect();
    };
  }

  private handleSnapshotEvent(event: MessageEvent<string>): void {
    try {
      const parsed = JSON.parse(event.data) as { snapshot?: BridgeSnapshot };
      if (parsed.snapshot) {
        this.options.onSnapshot(parsed.snapshot);
      }
    } catch {
      // ignore malformed payloads
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryDelay = Math.min(this.retryDelay * 2, 15_000);
      this.connect();
    }, this.retryDelay);
  }
}
