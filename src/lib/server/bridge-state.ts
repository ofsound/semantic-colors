import { createDefaultManifest } from '$lib/theme/defaults';
import { generateThemeCss } from '$lib/theme/css';
import { ensureManifest, resolveTheme, validateManifest } from '$lib/theme/engine';
import { toCssColor } from '$lib/theme/color';
import type { ResolvedTheme } from '$lib/theme/engine';
import type { OklchColor, ThemeManifest, ThemeMode, TokenId } from '$lib/theme/schema';
import { ALL_TOKEN_IDS, TOKENS_BY_GROUP, TOKEN_GROUP_ORDER } from '$lib/theme/schema';

/**
 * The bridge is the engine's live companion channel for external consumers
 * (notably the companion Chrome extension). It tracks the current authoring
 * snapshot and broadcasts changes over Server-Sent Events.
 */

export type BridgeOrigin = 'ui' | 'extension' | 'server';

export interface BridgeDraftState {
  dirty: boolean;
  baseVersion: number;
  lastEditor: BridgeOrigin;
}

export interface ResolvedThemePayload {
  mode: ThemeMode;
  colors: Record<TokenId, OklchColor & { css: string }>;
  cssVariables: Record<string, string>;
}

export interface BridgeSnapshot {
  version: number;
  updatedAt: string;
  origin: BridgeOrigin;
  configPath: string;
  draft: BridgeDraftState;
  manifest: ThemeManifest;
  resolved: Record<ThemeMode, ResolvedThemePayload>;
  css: string;
  tokenGroups: typeof TOKEN_GROUP_ORDER;
  tokensByGroup: typeof TOKENS_BY_GROUP;
  validations: ReturnType<typeof validateManifest>;
}

export interface BridgeEvent {
  type: 'snapshot' | 'hello' | 'ping';
  snapshot?: BridgeSnapshot;
}

type Subscriber = (event: BridgeEvent) => void;

function buildResolvedPayload(manifest: ThemeManifest, mode: ThemeMode): ResolvedThemePayload {
  const resolved: ResolvedTheme = resolveTheme(manifest, mode);
  const colors = {} as Record<TokenId, OklchColor & { css: string }>;
  const cssVariables: Record<string, string> = {};

  for (const tokenId of ALL_TOKEN_IDS) {
    const color = resolved.colors[tokenId];
    const css = toCssColor(color);
    colors[tokenId] = { ...color, css };
    cssVariables[`--theme-${tokenId}`] = css;
  }

  return { mode, colors, cssVariables };
}

function buildSnapshot(
  manifest: ThemeManifest,
  configPath: string,
  origin: BridgeOrigin,
  version: number,
  draft: BridgeDraftState
): BridgeSnapshot {
  const normalized = ensureManifest(manifest);
  return {
    version,
    updatedAt: new Date().toISOString(),
    origin,
    configPath,
    draft,
    manifest: normalized,
    resolved: {
      light: buildResolvedPayload(normalized, 'light'),
      dark: buildResolvedPayload(normalized, 'dark'),
      alt: buildResolvedPayload(normalized, 'alt')
    },
    css: generateThemeCss(normalized),
    tokenGroups: TOKEN_GROUP_ORDER,
    tokensByGroup: TOKENS_BY_GROUP,
    validations: validateManifest(normalized)
  };
}

class BridgeStateStore {
  private channels = new Map<string, BridgeChannel>();

  getSnapshot(configPath: string): BridgeSnapshot | null {
    return this.channels.get(configPath)?.getSnapshot() ?? null;
  }

  syncPersisted(manifest: ThemeManifest, configPath: string, origin: BridgeOrigin): BridgeSnapshot {
    return this.channel(configPath).syncPersisted(manifest, origin);
  }

  stage(manifest: ThemeManifest, configPath: string, origin: BridgeOrigin): BridgeSnapshot {
    return this.channel(configPath).stage(manifest, origin);
  }

  discard(configPath: string, origin: BridgeOrigin): BridgeSnapshot {
    return this.channel(configPath).discard(origin);
  }

  reset(configPath?: string): void {
    if (configPath) {
      this.channels.get(configPath)?.dispose();
      this.channels.delete(configPath);
      return;
    }

    for (const channel of this.channels.values()) {
      channel.dispose();
    }
    this.channels.clear();
  }

  subscribe(configPath: string, subscriber: Subscriber): () => void {
    return this.channel(configPath).subscribe(subscriber);
  }

  private channel(configPath: string): BridgeChannel {
    let channel = this.channels.get(configPath);
    if (!channel) {
      channel = new BridgeChannel(configPath);
      this.channels.set(configPath, channel);
    }
    return channel;
  }
}

class BridgeChannel {
  private subscribers = new Set<Subscriber>();
  private currentVersion = 0;
  private persistedVersion = 0;
  private persistedManifest: ThemeManifest = createDefaultManifest();
  private currentSnapshot: BridgeSnapshot;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly configPath: string) {
    this.currentSnapshot = buildSnapshot(createDefaultManifest(), configPath, 'server', 0, {
      dirty: false,
      baseVersion: 0,
      lastEditor: 'server'
    });
  }

  getSnapshot(): BridgeSnapshot {
    return this.currentSnapshot;
  }

  syncPersisted(manifest: ThemeManifest, origin: BridgeOrigin): BridgeSnapshot {
    this.currentVersion += 1;
    this.persistedVersion = this.currentVersion;
    this.persistedManifest = ensureManifest(manifest);
    this.currentSnapshot = buildSnapshot(
      this.persistedManifest,
      this.configPath,
      origin,
      this.currentVersion,
      {
        dirty: false,
        baseVersion: this.persistedVersion,
        lastEditor: origin
      }
    );
    this.broadcast({ type: 'snapshot', snapshot: this.currentSnapshot });
    return this.currentSnapshot;
  }

  stage(manifest: ThemeManifest, origin: BridgeOrigin): BridgeSnapshot {
    this.currentVersion += 1;
    const normalized = ensureManifest(manifest);
    const dirty = JSON.stringify(normalized) !== JSON.stringify(this.persistedManifest);
    this.currentSnapshot = buildSnapshot(normalized, this.configPath, origin, this.currentVersion, {
      dirty,
      baseVersion: this.persistedVersion,
      lastEditor: origin
    });
    this.broadcast({ type: 'snapshot', snapshot: this.currentSnapshot });
    return this.currentSnapshot;
  }

  discard(origin: BridgeOrigin): BridgeSnapshot {
    this.currentVersion += 1;
    this.currentSnapshot = buildSnapshot(
      this.persistedManifest,
      this.configPath,
      origin,
      this.currentVersion,
      {
        dirty: false,
        baseVersion: this.persistedVersion,
        lastEditor: origin
      }
    );
    this.broadcast({ type: 'snapshot', snapshot: this.currentSnapshot });
    return this.currentSnapshot;
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber({ type: 'hello', snapshot: this.currentSnapshot });
    this.ensureHeartbeat();
    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) {
        this.stopHeartbeat();
      }
    };
  }

  dispose(): void {
    this.subscribers.clear();
    this.stopHeartbeat();
  }

  private broadcast(event: BridgeEvent): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(event);
      } catch {
        this.subscribers.delete(subscriber);
      }
    }
  }

  private ensureHeartbeat(): void {
    if (this.pingTimer) return;
    this.pingTimer = setInterval(() => {
      this.broadcast({ type: 'ping' });
    }, 25_000);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}

const globalKey = Symbol.for('semantic-colors.bridge-state');
type GlobalWithBridge = typeof globalThis & { [k: symbol]: BridgeStateStore | undefined };
const globalRef = globalThis as GlobalWithBridge;

function getStore(): BridgeStateStore {
  const existing = globalRef[globalKey];
  if (
    !existing ||
    typeof existing.stage !== 'function' ||
    typeof existing.syncPersisted !== 'function' ||
    typeof existing.discard !== 'function' ||
    typeof existing.reset !== 'function'
  ) {
    globalRef[globalKey] = new BridgeStateStore();
  }
  return globalRef[globalKey]!;
}

export const bridgeState = {
  snapshot: (configPath: string) => getStore().getSnapshot(configPath),
  stage: (manifest: ThemeManifest, configPath: string, origin: BridgeOrigin) =>
    getStore().stage(manifest, configPath, origin),
  syncPersisted: (manifest: ThemeManifest, configPath: string, origin: BridgeOrigin) =>
    getStore().syncPersisted(manifest, configPath, origin),
  discard: (configPath: string, origin: BridgeOrigin) => getStore().discard(configPath, origin),
  reset: (configPath?: string) => getStore().reset(configPath),
  subscribe: (configPath: string, subscriber: Subscriber) =>
    getStore().subscribe(configPath, subscriber)
};
