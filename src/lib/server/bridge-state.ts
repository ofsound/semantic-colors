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
  version: number
): BridgeSnapshot {
  const normalized = ensureManifest(manifest);
  return {
    version,
    updatedAt: new Date().toISOString(),
    origin,
    configPath,
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
  private subscribers = new Set<Subscriber>();
  private currentVersion = 0;
  private currentSnapshot: BridgeSnapshot = buildSnapshot(createDefaultManifest(), '', 'server', 0);
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  getSnapshot(): BridgeSnapshot {
    return this.currentSnapshot;
  }

  publish(manifest: ThemeManifest, configPath: string, origin: BridgeOrigin): BridgeSnapshot {
    this.currentVersion += 1;
    this.currentSnapshot = buildSnapshot(manifest, configPath, origin, this.currentVersion);
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
  if (!globalRef[globalKey]) {
    globalRef[globalKey] = new BridgeStateStore();
  }
  return globalRef[globalKey]!;
}

export const bridgeState = {
  snapshot: () => getStore().getSnapshot(),
  publish: (manifest: ThemeManifest, configPath: string, origin: BridgeOrigin) =>
    getStore().publish(manifest, configPath, origin),
  subscribe: (subscriber: Subscriber) => getStore().subscribe(subscriber)
};
