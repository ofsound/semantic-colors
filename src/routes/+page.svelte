<script lang="ts">
  import '$lib/styles/semantic-colors-shell.css';
  import { onMount } from 'svelte';
  import AliasPanel from '$lib/components/semantic-colors/AliasPanel.svelte';
  import FixtureStage from '$lib/components/semantic-colors/FixtureStage.svelte';
  import ImportReview from '$lib/components/semantic-colors/ImportReview.svelte';
  import ModeControls from '$lib/components/semantic-colors/ModeControls.svelte';
  import ProjectPanel from '$lib/components/semantic-colors/ProjectPanel.svelte';
  import TokenEditor from '$lib/components/semantic-colors/TokenEditor.svelte';
  import TokenInventory from '$lib/components/semantic-colors/TokenInventory.svelte';
  import { createDefaultManifest } from '$lib/theme/defaults';
  import {
    ensureManifest,
    resolveTheme,
    summarizeTokenValidation,
    themeCssVariables,
    validateManifest
  } from '$lib/theme/engine';
  import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';
  import type {
    ImportProposal,
    LocalAlias,
    ProjectConfig,
    ThemeMode,
    TokenId
  } from '$lib/theme/schema';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let manifest = $state(ensureManifest(createDefaultManifest()));
  let config = $state<ProjectConfig>({
    ...DEFAULT_PROJECT_CONFIG
  });
  let configPath = $state('');
  let selectedTokenId = $state<TokenId>('surface');
  let activeMode = $state<ThemeMode>('light');
  let importProposal = $state<ImportProposal | null>(null);
  let importSelection = $state<Record<string, TokenId | ''>>({});
  let isImporting = $state(false);
  let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let saveMessage = $state('Ready');
  let holdPreviewStartedAt = 0;
  let holdPreviewReturnMode: ThemeMode | null = null;
  let booted = false;

  const saveHeading = $derived(
    saveState === 'saving'
      ? 'Autosaving'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Save failed'
          : 'Ready'
  );
  const saveHint = $derived(
    saveState === 'error'
      ? 'Check the configured paths, then retry or reload the project state.'
      : saveState === 'saving'
        ? 'Changes are persisted automatically after a short pause.'
        : config.bridgeEnabled
          ? 'Bridge output is enabled. Saving updates both the manifest and generated CSS.'
          : 'Bridge output is disabled. Saving updates the local manifest and config only.'
  );
  const showSetupGuide = $derived(
    !config.bridgeEnabled && !config.importSourcePath && manifest.aliases.length === 0
  );

  function applyPageData(value: PageData): void {
    manifest = ensureManifest(value.manifest);
    config = {
      ...DEFAULT_PROJECT_CONFIG,
      ...value.config,
      projectRoot: value.config.projectRoot || ''
    };
    configPath = value.configPath;
  }

  const loadInitialData = () => data;
  applyPageData(loadInitialData());

  const lightTheme = $derived(resolveTheme(manifest, 'light'));
  const darkTheme = $derived(resolveTheme(manifest, 'dark'));
  const altTheme = $derived(resolveTheme(manifest, 'alt'));
  const currentTheme = $derived(
    activeMode === 'light' ? lightTheme : activeMode === 'dark' ? darkTheme : altTheme
  );
  const validations = $derived(validateManifest(manifest));
  const selectedToken = $derived(manifest.tokens[selectedTokenId]);
  const selectedTokenNotes = $derived(
    summarizeTokenValidation(validations[activeMode].perToken[selectedTokenId])
  );
  const stageStyle = $derived(`${themeCssVariables(currentTheme)}\n`);
  const currentTokenAlt = $derived(altTheme.colors[selectedTokenId]);

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
    const response = await fetch(`/api/project/load?configPath=${encodeURIComponent(configPath)}`);
    if (!response.ok) {
      saveState = 'error';
      saveMessage = await responseMessage(response, `Reload failed with status ${response.status}`);
      return;
    }

    const nextData = (await response.json()) as PageData;
    applyPageData(nextData);
    saveState = 'saved';
    saveMessage = 'Reloaded project state';
  }

  async function persistState(): Promise<void> {
    saveState = 'saving';
    saveMessage = 'Saving manifest and generated CSS...';

    try {
      const response = await fetch('/api/project/save', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          configPath,
          config: $state.snapshot(config),
          manifest: {
            ...$state.snapshot(manifest),
            updatedAt: new Date().toISOString()
          }
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

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let bridgeTimer: ReturnType<typeof setTimeout> | null = null;

  async function publishToBridge(): Promise<void> {
    try {
      await fetch('/api/bridge/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          configPath,
          manifest: $state.snapshot(manifest),
          origin: 'ui'
        })
      });
    } catch {
      // Bridge is a best-effort channel; ignore publish failures.
    }
  }

  $effect(() => {
    void JSON.stringify($state.snapshot(manifest));
    void JSON.stringify($state.snapshot(config));
    void configPath;

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
  });

  $effect(() => {
    document.documentElement.dataset.theme = activeMode;
  });

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
        manifest = ensureManifest(message.snapshot.manifest as never);
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

  onMount(() => {
    booted = true;
    void publishToBridge();
    const unsubscribe = subscribeToBridge();
    return () => {
      unsubscribe();
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      if (bridgeTimer) {
        clearTimeout(bridgeTimer);
      }
    };
  });

  function isSelectedUsage(tokenIds: TokenId[]): boolean {
    return tokenIds.includes(selectedTokenId);
  }

  function hasWarnings(tokenIds: TokenId[]): boolean {
    return tokenIds.some(
      (tokenId) => summarizeTokenValidation(validations[activeMode].perToken[tokenId]).length > 0
    );
  }

  function selectToken(tokenId: TokenId): void {
    selectedTokenId = tokenId;
  }

  function updateAltDelta(channel: 'l' | 'c' | 'h', value: number): void {
    manifest.alt.delta[channel] = value;
  }

  function setTheme(mode: ThemeMode): void {
    activeMode = mode;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLElement && event.target.isContentEditable) {
      return;
    }

    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      return;
    }

    if (event.key === '1') {
      activeMode = 'light';
      return;
    }

    if (event.key === '2') {
      activeMode = 'dark';
      return;
    }

    if (event.key === '3' && !event.repeat) {
      holdPreviewReturnMode = activeMode === 'alt' ? null : activeMode;
      holdPreviewStartedAt = performance.now();
      activeMode = 'alt';
      return;
    }

    if (event.key.toLowerCase() === 'l') {
      manifest.alt.grayscalePreview = !manifest.alt.grayscalePreview;
    }
  }

  function handleKeyup(event: KeyboardEvent): void {
    if (event.key === '3' && holdPreviewReturnMode) {
      const heldFor = performance.now() - holdPreviewStartedAt;
      if (heldFor > 180) {
        activeMode = holdPreviewReturnMode;
      }
      holdPreviewReturnMode = null;
    }
  }

  function addAlias(): void {
    manifest.aliases = [
      ...manifest.aliases,
      {
        name: 'color-new-alias',
        tokenId: selectedTokenId
      }
    ];
  }

  function removeAlias(index: number): void {
    manifest.aliases = manifest.aliases.filter((_, aliasIndex) => aliasIndex !== index);
  }

  function updateAlias(index: number, patch: Partial<LocalAlias>): void {
    manifest.aliases[index] = {
      ...manifest.aliases[index],
      ...patch
    };
  }

  function warningNotes(tokenIds: TokenId[]): string[] {
    return [
      ...new Set(
        tokenIds.flatMap((tokenId) =>
          summarizeTokenValidation(validations[activeMode].perToken[tokenId])
        )
      )
    ];
  }

  function warningSummary(tokenIds: TokenId[]): string {
    const notes = warningNotes(tokenIds);
    if (notes.length === 0) {
      return 'No validation warnings.';
    }

    return `${notes.length} validation warning${notes.length === 1 ? '' : 's'}: ${notes.join(' ')}`;
  }

  async function retrySave(): Promise<void> {
    await persistState();
  }

  function confirmResetManifest(): void {
    const confirmed = window.confirm(
      'Reset the manifest to defaults? This replaces all token anchors, alt settings, and aliases in the current project.'
    );

    if (!confirmed) {
      return;
    }

    resetManifest();
    saveMessage = 'Reset the manifest to the default semantic color set.';
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
          configPath,
          sourcePath: config.importSourcePath
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
    saveMessage = 'Applied reviewed import mappings into the canonical manifest.';
  }

  function resetManifest(): void {
    manifest = createDefaultManifest();
    selectedTokenId = 'surface';
  }

  function tokenLabel(tokenId: TokenId): string {
    return manifest.tokens[tokenId].label;
  }
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<svelte:head>
  <title>Semantic Colors</title>
</svelte:head>

<a class="skip-link" href="#preview-stage">Skip to preview harness</a>

<div class="semantic-colors-app workspace">
  <aside class="sidebar">
    <ProjectPanel
      bind:config
      bind:configPath
      {saveHeading}
      {saveHint}
      {saveMessage}
      {saveState}
      {showSetupGuide}
      onReload={reloadProject}
      onRetrySave={retrySave}
    />
    <ModeControls bind:manifest {activeMode} {setTheme} {updateAltDelta} />
    <TokenEditor
      bind:manifest
      {activeMode}
      {currentTokenAlt}
      {selectedTokenId}
      {selectedTokenNotes}
      {setTheme}
      {tokenLabel}
    />
    <AliasPanel {addAlias} {manifest} {removeAlias} {tokenLabel} {updateAlias} />
    <ImportReview
      bind:config
      bind:importSelection
      {applyImportReview}
      {confirmResetManifest}
      {importProposal}
      {isImporting}
      {runImport}
      {tokenLabel}
    />
  </aside>

  <main class="stage-shell">
    <FixtureStage
      {activeMode}
      grayscalePreview={manifest.alt.grayscalePreview}
      {hasWarnings}
      {isSelectedUsage}
      {saveMessage}
      {saveState}
      {selectToken}
      {selectedTokenId}
      selectedTokenLabel={selectedToken.label}
      {stageStyle}
      {tokenLabel}
      {warningSummary}
    />
    <TokenInventory
      currentColors={currentTheme.colors}
      {hasWarnings}
      {isSelectedUsage}
      {selectToken}
      {selectedTokenId}
      {tokenLabel}
      {warningSummary}
    />
  </main>
</div>
