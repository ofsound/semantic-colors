import {
  parseBridgeSnapshotResponse,
  parseBridgeSseSnapshotEvent
} from '$lib/theme/bridge-client-payloads';
import { ensureManifest } from '$lib/theme/engine';
import type { ImportProposal, ProjectConfig, ThemeManifest, TokenId } from '$lib/theme/schema';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface WorkspacePageData {
  configPath: string;
  config: ProjectConfig;
  manifest: ThemeManifest;
}

interface WorkspaceControllerOptions {
  applyPageData: (value: WorkspacePageData) => void;
  getConfig: () => ProjectConfig;
  getConfigPath: () => string;
  getManifest: () => ThemeManifest;
  replaceManifest: (manifest: ThemeManifest) => void;
}

export function createWorkspaceController(options: WorkspaceControllerOptions) {
  let importProposal = $state<ImportProposal | null>(null);
  let importSelection = $state<Record<string, TokenId | ''>>({});
  let isImporting = $state(false);
  let saveState = $state<SaveState>('idle');
  let saveMessage = $state('Ready');

  let booted = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let bridgeTimer: ReturnType<typeof setTimeout> | null = null;
  let saveStateTimer: ReturnType<typeof setTimeout> | null = null;
  let bridgeSubscription: (() => void) | null = null;
  let bridgeSubscriptionConfigPath = '';

  function bridgeQuery(configPath: string): string {
    return `configPath=${encodeURIComponent(configPath)}`;
  }

  function clearSaveStateTimer(): void {
    if (saveStateTimer) {
      clearTimeout(saveStateTimer);
      saveStateTimer = null;
    }
  }

  function setSaveFeedback(
    state: SaveState,
    message: string,
    resetAfterMs: number | null = null
  ): void {
    clearSaveStateTimer();
    saveState = state;
    saveMessage = message;

    if (resetAfterMs !== null) {
      saveStateTimer = setTimeout(() => {
        saveState = 'idle';
      }, resetAfterMs);
    }
  }

  async function responseMessage(response: Response, fallback: string): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (payload?.message) {
        return payload.message;
      }
    }

    const text = await response.text().catch(() => '');
    return text.trim() || fallback;
  }

  async function reloadProject(): Promise<void> {
    const configPath = options.getConfigPath();
    const response = await fetch(`/api/project/load?configPath=${encodeURIComponent(configPath)}`);
    if (!response.ok) {
      setSaveFeedback(
        'error',
        await responseMessage(response, `Reload failed with status ${response.status}`)
      );
      return;
    }

    const nextData = (await response.json()) as WorkspacePageData;
    options.applyPageData(nextData);
    ensureBridgeSubscription();
    setSaveFeedback('saved', 'Reloaded project state', 1800);
  }

  async function persistState(): Promise<void> {
    setSaveFeedback('saving', 'Saving manifest and generated CSS...');

    try {
      const config = $state.snapshot(options.getConfig());
      const manifest = $state.snapshot(options.getManifest());
      const response = await fetch('/api/project/save', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          configPath: options.getConfigPath(),
          config,
          manifest
        })
      });

      if (!response.ok) {
        throw new Error(
          await responseMessage(response, `Save failed with status ${response.status}`)
        );
      }

      setSaveFeedback(
        'saved',
        config.bridgeEnabled
          ? 'Saved manifest and regenerated target CSS.'
          : 'Saved manifest and config. Bridge output is currently disabled.',
        1800
      );
      ensureBridgeSubscription();
      await publishToBridge(true);
    } catch (error) {
      setSaveFeedback('error', error instanceof Error ? error.message : 'Save failed');
    }
  }

  async function publishToBridge(persisted = false): Promise<void> {
    try {
      ensureBridgeSubscription();
      await fetch('/api/bridge/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          configPath: options.getConfigPath(),
          manifest: $state.snapshot(options.getManifest()),
          origin: 'ui',
          persisted
        })
      });
    } catch {
      // Bridge is a best-effort channel; ignore publish failures.
    }
  }

  function clearTimers(): void {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (bridgeTimer) {
      clearTimeout(bridgeTimer);
      bridgeTimer = null;
    }

    clearSaveStateTimer();
  }

  function ensureBridgeSubscription(): void {
    const configPath = options.getConfigPath();
    if (typeof window === 'undefined' || typeof EventSource === 'undefined' || !configPath) {
      return;
    }

    if (bridgeSubscription && bridgeSubscriptionConfigPath === configPath) {
      return;
    }

    bridgeSubscription?.();
    bridgeSubscription = null;
    bridgeSubscriptionConfigPath = configPath;

    const source = new EventSource(`/api/bridge/events?${bridgeQuery(configPath)}`);
    source.addEventListener('snapshot', (event) => {
      try {
        const raw: unknown = JSON.parse((event as MessageEvent<string>).data);
        const snapshot = parseBridgeSseSnapshotEvent(raw);
        if (
          !snapshot ||
          snapshot.origin === 'ui' ||
          snapshot.configPath !== options.getConfigPath()
        ) {
          return;
        }

        options.replaceManifest(ensureManifest(snapshot.manifest));
        saveMessage = snapshot.draft?.dirty
          ? `Applied staged update from ${snapshot.origin} via bridge.`
          : `Applied committed update from ${snapshot.origin} via bridge.`;
      } catch {
        // Ignore malformed snapshots.
      }
    });
    source.onerror = () => {
      source.close();
    };

    bridgeSubscription = () => source.close();
  }

  function markPersistDirty(): void {
    if (!booted) {
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      void persistState();
    }, 500);

    if (bridgeTimer) {
      clearTimeout(bridgeTimer);
    }
    bridgeTimer = setTimeout(() => {
      ensureBridgeSubscription();
      void publishToBridge();
    }, 80);
  }

  async function syncBridgeOnConnect(): Promise<void> {
    try {
      const configPath = options.getConfigPath();
      const response = await fetch(`/api/bridge/snapshot?${bridgeQuery(configPath)}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        await publishToBridge(true);
        return;
      }

      const raw: unknown = await response.json();
      const payload = parseBridgeSnapshotResponse(raw);

      if (payload?.draft?.dirty && payload.configPath === options.getConfigPath()) {
        options.replaceManifest(ensureManifest(payload.manifest));
        saveMessage = 'Loaded staged bridge draft.';
        return;
      }

      await publishToBridge(true);
    } catch {
      await publishToBridge(true);
    }
  }

  function connect(): () => void {
    booted = true;
    ensureBridgeSubscription();
    void syncBridgeOnConnect();

    return () => {
      booted = false;
      bridgeSubscription?.();
      bridgeSubscription = null;
      bridgeSubscriptionConfigPath = '';
      clearTimers();
    };
  }

  async function runImport(): Promise<void> {
    isImporting = true;
    saveMessage = 'Scanning CSS variables from source file...';

    try {
      const response = await fetch('/api/project/import', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          configPath: options.getConfigPath(),
          sourcePath: options.getConfig().importSourcePath
        })
      });

      if (!response.ok) {
        throw new Error(
          await responseMessage(response, `Import failed with status ${response.status}`)
        );
      }

      importProposal = (await response.json()) as ImportProposal;
      importSelection = Object.fromEntries(
        importProposal.candidates.map((candidate) => [
          candidate.sourceName,
          candidate.suggestedTokenId ?? ''
        ])
      );
      saveMessage = `Imported ${importProposal.candidates.length} custom properties for review.`;
    } catch (error) {
      saveMessage = error instanceof Error ? error.message : 'Import failed';
    } finally {
      isImporting = false;
    }
  }

  function applyImportReview(): void {
    if (!importProposal) {
      return;
    }

    const manifest = options.getManifest();
    for (const candidate of importProposal.candidates) {
      const tokenId = importSelection[candidate.sourceName];
      if (!tokenId) {
        continue;
      }

      if (candidate.light) {
        manifest.tokens[tokenId].light = { ...candidate.light };
      }
      if (candidate.dark) {
        manifest.tokens[tokenId].dark = { ...candidate.dark };
      }

      if (!manifest.aliases.some((alias) => alias.name === candidate.sourceName)) {
        manifest.aliases = [
          ...manifest.aliases,
          {
            name: candidate.sourceName,
            tokenId
          }
        ];
      }
    }

    importProposal = null;
    markPersistDirty();
    saveMessage = 'Applied reviewed import mappings into the canonical manifest.';
  }

  function setSaveMessage(message: string): void {
    saveMessage = message;
  }

  return {
    get importProposal() {
      return importProposal;
    },
    get importSelection() {
      return importSelection;
    },
    set importSelection(value: Record<string, TokenId | ''>) {
      importSelection = value;
    },
    get isImporting() {
      return isImporting;
    },
    get saveMessage() {
      return saveMessage;
    },
    get saveState() {
      return saveState;
    },
    applyImportReview,
    connect,
    markPersistDirty,
    reloadProject,
    retrySave: persistState,
    runImport,
    setSaveMessage
  };
}
