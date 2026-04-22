<script lang="ts">
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
  import { createWorkspaceController } from '$lib/theme/workspace-controller.svelte';
  import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';
  import type { LocalAlias, ProjectConfig, ThemeMode, TokenId } from '$lib/theme/schema';
  import type { PageData } from './$types';
  import '$lib/styles/semantic-colors-shell.css';

  const SIDEBAR_TABS = [
    { id: 'project', label: 'Project' },
    { id: 'modes', label: 'Alt' },
    { id: 'token', label: 'Token' },
    { id: 'aliases', label: 'Aliases' },
    { id: 'import', label: 'Import' }
  ] as const;
  const MAIN_TABS = [
    { id: 'preview', label: 'Preview App' },
    { id: 'inventory', label: 'Token Inventory' }
  ] as const;

  type SidebarTabId = (typeof SIDEBAR_TABS)[number]['id'];
  type MainTabId = (typeof MAIN_TABS)[number]['id'];

  let { data }: { data: PageData } = $props();

  let manifest = $state(ensureManifest(createDefaultManifest()));
  let config = $state<ProjectConfig>({
    ...DEFAULT_PROJECT_CONFIG
  });
  let configPath = $state('');
  let sidebarCollapsed = $state(false);
  let activeSidebarTab = $state<SidebarTabId>('project');
  let activeMainTab = $state<MainTabId>('preview');
  let selectedTokenId = $state<TokenId>('surface');
  let activeMode = $state<ThemeMode>('light');
  let holdPreviewStartedAt = 0;
  let holdPreviewReturnMode: ThemeMode | null = null;

  const workspace = createWorkspaceController({
    applyPageData,
    getConfig: () => config,
    getConfigPath: () => configPath,
    getManifest: () => manifest,
    replaceManifest: (value) => {
      manifest = value;
    }
  });

  const saveHeading = $derived(
    workspace.saveState === 'saving'
      ? 'Autosaving'
      : workspace.saveState === 'saved'
        ? 'Saved'
        : workspace.saveState === 'error'
          ? 'Save failed'
          : 'Ready'
  );
  const saveHint = $derived(
    workspace.saveState === 'error'
      ? 'Check the configured paths, then retry or reload the project state.'
      : workspace.saveState === 'saving'
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

  $effect(() => {
    document.documentElement.dataset.theme = activeMode;
  });

  onMount(() => {
    return workspace.connect();
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

  function selectPreviewToken(tokenId: TokenId): void {
    selectedTokenId = tokenId;
    activeSidebarTab = 'token';
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
      workspace.markPersistDirty();
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
    workspace.markPersistDirty();
  }

  function removeAlias(index: number): void {
    manifest.aliases = manifest.aliases.filter((_, aliasIndex) => aliasIndex !== index);
    workspace.markPersistDirty();
  }

  function updateAlias(index: number, patch: Partial<LocalAlias>): void {
    manifest.aliases[index] = {
      ...manifest.aliases[index],
      ...patch
    };
    workspace.markPersistDirty();
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

  function confirmResetManifest(): void {
    const confirmed = window.confirm(
      'Reset the manifest to defaults? This replaces all token anchors, alt settings, and aliases in the current project.'
    );

    if (!confirmed) {
      return;
    }

    resetManifest();
    workspace.markPersistDirty();
    workspace.setSaveMessage('Reset the manifest to the default semantic color set.');
  }

  function resetManifest(): void {
    manifest = createDefaultManifest();
    selectedTokenId = 'surface';
  }

  function tokenLabel(tokenId: TokenId): string {
    return manifest.tokens[tokenId].label;
  }

  function toggleSidebar(): void {
    sidebarCollapsed = !sidebarCollapsed;
  }
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<svelte:head>
  <title>Semantic Colors</title>
</svelte:head>

<div
  class={`semantic-colors-app workspace ${sidebarCollapsed ? 'workspace-sidebar-collapsed' : ''}`}
>
  <aside class={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <div class="sidebar-toolbar">
      <button
        aria-label={sidebarCollapsed ? 'Show authoring panels' : 'Collapse sidebar'}
        class={`ghost-button sidebar-toggle ${sidebarCollapsed ? 'sidebar-toggle-collapsed' : ''}`}
        onclick={toggleSidebar}
        type="button"
      >
        <span aria-hidden="true" class="sidebar-toggle-icon">
          {sidebarCollapsed ? '>' : '<'}
        </span>
        {#if !sidebarCollapsed}
          <span>Collapse Sidebar</span>
        {/if}
      </button>
    </div>

    {#if !sidebarCollapsed}
      <div aria-label="Authoring panels" class="sidebar-tab-strip" role="tablist">
        {#each SIDEBAR_TABS as tab (tab.id)}
          <button
            aria-controls={`sidebar-panel-${tab.id}`}
            aria-selected={activeSidebarTab === tab.id}
            class={`sidebar-tab ${activeSidebarTab === tab.id ? 'sidebar-tab-active' : ''}`}
            onclick={() => {
              activeSidebarTab = tab.id;
            }}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="sidebar-panel-shell" id={`sidebar-panel-${activeSidebarTab}`} role="tabpanel">
        {#if activeSidebarTab === 'project'}
          <ProjectPanel
            bind:config
            bind:configPath
            onPersistChange={workspace.markPersistDirty}
            {saveHeading}
            {saveHint}
            saveMessage={workspace.saveMessage}
            saveState={workspace.saveState}
            {showSetupGuide}
            onReload={workspace.reloadProject}
            onRetrySave={workspace.retrySave}
          />
        {:else if activeSidebarTab === 'modes'}
          <ModeControls
            bind:manifest
            onActivateAltPreview={() => setTheme('alt')}
            onPersistChange={workspace.markPersistDirty}
            {activeMode}
            {updateAltDelta}
          />
        {:else if activeSidebarTab === 'token'}
          <TokenEditor
            bind:manifest
            {activeMode}
            {currentTokenAlt}
            onPersistChange={workspace.markPersistDirty}
            {selectedTokenId}
            {selectedTokenNotes}
            {setTheme}
            {tokenLabel}
          />
        {:else if activeSidebarTab === 'aliases'}
          <AliasPanel {addAlias} {manifest} {removeAlias} {tokenLabel} {updateAlias} />
        {:else}
          <ImportReview
            bind:config
            bind:importSelection={workspace.importSelection}
            applyImportReview={workspace.applyImportReview}
            {confirmResetManifest}
            importProposal={workspace.importProposal}
            isImporting={workspace.isImporting}
            onPersistChange={workspace.markPersistDirty}
            runImport={workspace.runImport}
            {tokenLabel}
          />
        {/if}
      </div>
    {/if}
  </aside>

  <main class="stage-shell">
    <header class="stage-header stage-header-fixed">
      <div
        aria-label="Main viewport panels"
        class="sidebar-tab-strip stage-tab-strip"
        role="tablist"
      >
        {#each MAIN_TABS as tab (tab.id)}
          <button
            aria-controls={`main-panel-${tab.id}`}
            aria-selected={activeMainTab === tab.id}
            class={`sidebar-tab ${activeMainTab === tab.id ? 'sidebar-tab-active' : ''}`}
            onclick={() => {
              activeMainTab = tab.id;
            }}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        {/each}
      </div>
      <div class="stage-status">
        <div class="stage-mode-row">
          <button
            aria-keyshortcuts="L"
            aria-label="Grayscale preview (shortcut L)"
            aria-pressed={manifest.alt.grayscalePreview}
            class={`sidebar-tab stage-mode-button ${manifest.alt.grayscalePreview ? 'sidebar-tab-active' : ''}`}
            onclick={() => {
              manifest.alt.grayscalePreview = !manifest.alt.grayscalePreview;
              workspace.markPersistDirty();
            }}
            type="button"
          >
            Grayscale
          </button>
          <button
            aria-pressed={activeMode === 'light'}
            class={`sidebar-tab stage-mode-button ${activeMode === 'light' ? 'sidebar-tab-active' : ''}`}
            onclick={() => setTheme('light')}
            type="button"
          >
            1 Light
          </button>
          <button
            aria-pressed={activeMode === 'dark'}
            class={`sidebar-tab stage-mode-button ${activeMode === 'dark' ? 'sidebar-tab-active' : ''}`}
            onclick={() => setTheme('dark')}
            type="button"
          >
            2 Dark
          </button>
          <button
            aria-pressed={activeMode === 'alt'}
            class={`sidebar-tab stage-mode-button ${activeMode === 'alt' ? 'sidebar-tab-active' : ''}`}
            onclick={() => setTheme('alt')}
            type="button"
          >
            3 Alt
          </button>
        </div>
        <div class="stage-meta">
          <span>Selected: {selectedToken.label}</span>
        </div>
      </div>
    </header>

    <div class="stage-content-shell" id={`main-panel-${activeMainTab}`} role="tabpanel">
      {#if activeMainTab === 'preview'}
        <FixtureStage
          {activeMode}
          grayscalePreview={manifest.alt.grayscalePreview}
          {hasWarnings}
          {isSelectedUsage}
          saveMessage={workspace.saveMessage}
          saveState={workspace.saveState}
          selectToken={selectPreviewToken}
          {selectedTokenId}
          {stageStyle}
          {tokenLabel}
          {warningSummary}
        />
      {:else}
        <TokenInventory
          currentColors={currentTheme.colors}
          grayscalePreview={manifest.alt.grayscalePreview}
          {hasWarnings}
          {isSelectedUsage}
          {selectToken}
          {selectedTokenId}
          {stageStyle}
          {tokenLabel}
          {warningSummary}
        />
      {/if}
    </div>
  </main>
</div>
