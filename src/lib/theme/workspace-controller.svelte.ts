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
      saveState = 'error';
      saveMessage = await responseMessage(response, `Reload failed with status ${response.status}`);
      return;
    }

    const nextData = (await response.json()) as WorkspacePageData;
    options.applyPageData(nextData);
    saveState = 'saved';
    saveMessage = 'Reloaded project state';
  }

  async function persistState(): Promise<void> {
    saveState = 'saving';
    saveMessage = 'Saving manifest and generated CSS...';

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

      saveState = 'saved';
      saveMessage = config.bridgeEnabled
        ? 'Saved manifest and regenerated target CSS.'
        : 'Saved manifest and config. Bridge output is currently disabled.';
    } catch (error) {
      saveState = 'error';
      saveMessage = error instanceof Error ? error.message : 'Save failed';
    }
  }

  async function publishToBridge(): Promise<void> {
    try {
      await fetch('/api/bridge/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          configPath: options.getConfigPath(),
          manifest: $state.snapshot(options.getManifest()),
          origin: 'ui'
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
      void publishToBridge();
    }, 80);
  }

  function subscribeToBridge(): () => void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return () => {};
    }

    const source = new EventSource('/api/bridge/events');
    source.addEventListener('snapshot', (event) => {
      try {
        const message = JSON.parse((event as MessageEvent<string>).data) as {
          snapshot?: { origin?: string; manifest?: unknown };
        };
        if (!message.snapshot || message.snapshot.origin === 'ui') {
          return;
        }

        options.replaceManifest(ensureManifest(message.snapshot.manifest as never));
        markPersistDirty();
        saveMessage = `Applied live update from ${message.snapshot.origin} via bridge.`;
      } catch {
        // Ignore malformed snapshots.
      }
    });
    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }

  function connect(): () => void {
    booted = true;
    void publishToBridge();
    const unsubscribe = subscribeToBridge();

    return () => {
      booted = false;
      unsubscribe();
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
