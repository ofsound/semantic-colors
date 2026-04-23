import type { BridgeConfigState, BridgeDraftCommand, BridgeSnapshot, OklchColor } from './types';

export type BridgeStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface BridgeClientOptions {
  getBaseUrl: () => string;
  getConfigPath: () => string;
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

  async fetchSnapshot(configPath = this.requireConfigPath()): Promise<BridgeSnapshot> {
    const response = await fetch(this.snapshotUrl(configPath), {
      method: 'GET',
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Snapshot request failed with status ${response.status}`);
    }
    return (await response.json()) as BridgeSnapshot;
  }

  async fetchBridgeConfig(configPath = this.requireConfigPath()): Promise<BridgeConfigState> {
    const response = await fetch(
      `${this.options.getBaseUrl()}/api/bridge/config?configPath=${encodeURIComponent(configPath)}`,
      {
        method: 'GET',
        cache: 'no-store'
      }
    );
    if (!response.ok) {
      throw new Error(`Bridge config request failed with status ${response.status}`);
    }
    return (await response.json()) as BridgeConfigState;
  }

  async updateBridgeConfig(
    bridgeEnabled: boolean,
    options: { configPath?: string } = {}
  ): Promise<BridgeConfigState> {
    const configPath = options.configPath ?? this.requireConfigPath();
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        configPath,
        bridgeEnabled
      })
    });
    if (!response.ok) {
      throw new Error(`Bridge config update failed with status ${response.status}`);
    }
    return (await response.json()) as BridgeConfigState;
  }

  async pushOverride(
    tokenId: string,
    mode: 'light' | 'dark' | 'both',
    color: OklchColor,
    options: { persist?: boolean; configPath?: string } = {}
  ): Promise<void> {
    const configPath = options.configPath ?? this.requireConfigPath();
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        tokenId,
        mode,
        color,
        persist: options.persist ?? false,
        configPath
      })
    });
    if (!response.ok) {
      throw new Error(`Override failed with status ${response.status}`);
    }
  }

  async applyDraft(
    commands: BridgeDraftCommand[],
    options: { configPath?: string } = {}
  ): Promise<void> {
    const configPath = options.configPath ?? this.requireConfigPath();
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/draft`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        configPath,
        commands
      })
    });
    if (!response.ok) {
      throw new Error(`Draft update failed with status ${response.status}`);
    }
  }

  async commitDraft(options: { configPath?: string } = {}): Promise<void> {
    const configPath = options.configPath ?? this.requireConfigPath();
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/commit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        configPath
      })
    });
    if (!response.ok) {
      throw new Error(`Commit failed with status ${response.status}`);
    }
  }

  async discardDraft(options: { configPath?: string } = {}): Promise<void> {
    const configPath = options.configPath ?? this.requireConfigPath();
    const response = await fetch(`${this.options.getBaseUrl()}/api/bridge/discard`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        configPath
      })
    });
    if (!response.ok) {
      throw new Error(`Discard failed with status ${response.status}`);
    }
  }

  private connect(): void {
    if (this.stopped) return;
    const configPath = this.options.getConfigPath().trim();
    if (!configPath) {
      this.options.onStatus('idle', 'choose target config');
      return;
    }

    this.options.onStatus('connecting');
    const url = this.eventsUrl(configPath);
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

  private requireConfigPath(): string {
    const configPath = this.options.getConfigPath().trim();
    if (!configPath) {
      throw new Error('Choose a target project config first.');
    }
    return configPath;
  }

  private snapshotUrl(configPath: string): string {
    return `${this.options.getBaseUrl()}/api/bridge/snapshot?configPath=${encodeURIComponent(configPath)}`;
  }

  private eventsUrl(configPath: string): string {
    return `${this.options.getBaseUrl()}/api/bridge/events?configPath=${encodeURIComponent(configPath)}`;
  }
}
