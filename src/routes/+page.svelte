<script lang="ts">
  import { onMount } from 'svelte';
  import WorkspaceMainStage from '$lib/components/semantic-colors/workspace/WorkspaceMainStage.svelte';
  import WorkspaceSaveToast from '$lib/components/semantic-colors/workspace/WorkspaceSaveToast.svelte';
  import WorkspaceShellThemeBar from '$lib/components/semantic-colors/workspace/WorkspaceShellThemeBar.svelte';
  import WorkspaceSidebar from '$lib/components/semantic-colors/workspace/WorkspaceSidebar.svelte';
  import { createDefaultManifest } from '$lib/theme/defaults';
  import {
    ensureManifest,
    resolveTheme,
    summarizeTokenValidation,
    themeCssVariables,
    validateManifest
  } from '$lib/theme/engine';
  import { createPreviewShortcutController } from '$lib/theme/keyboard-shortcuts';
  import { DEFAULT_PROJECT_CONFIG } from '$lib/theme/schema';
  import type { LocalAlias, ProjectConfig, ThemeMode, TokenId } from '$lib/theme/schema';
  import {
    BORDER_PREVIEW_LABELS,
    BORDER_PREVIEW_MODES,
    type BorderPreviewMode,
    type MainTabId,
    type SidebarTabId
  } from '$lib/theme/workspace-page-constants';
  import { createWorkspaceController } from '$lib/theme/workspace-controller.svelte';
  import type { PageData } from './$types';

  import '$lib/styles/semantic-colors-shell.css';

  let { data }: { data: PageData } = $props();

  let manifest = $state(ensureManifest(createDefaultManifest()));
  let config = $state<ProjectConfig>({
    ...DEFAULT_PROJECT_CONFIG
  });
  let configPath = $state('');
  let sidebarCollapsed = $state(false);
  let activeSidebarTab = $state<SidebarTabId>('token');
  let activeMainTab = $state<MainTabId>('preview');
  let borderPreviewMode = $state<BorderPreviewMode>('none');
  let selectedTokenId = $state<TokenId>('surface');
  let activeMode = $state<ThemeMode>('light');
  let shellMode = $state<ThemeMode>('light');

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
  const saveToastTone = $derived(
    workspace.saveState === 'error'
      ? 'save-toast-error'
      : workspace.saveState === 'saved'
        ? 'save-toast-saved'
        : 'save-toast-saving'
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
  const selectedTokenNotes = $derived(
    summarizeTokenValidation(validations[activeMode].perToken[selectedTokenId])
  );
  const stageStyle = $derived(`${themeCssVariables(currentTheme)}\n`);
  const borderPreviewLabelSync = $derived(BORDER_PREVIEW_LABELS[borderPreviewMode]);
  const previewStageStyle = $derived(
    `${stageStyle}  --preview-border-color: ${borderPreviewMode === 'none' ? 'transparent' : `var(--theme-${borderPreviewMode})`};\n  --preview-border-width: 1px;\n`
  );
  const currentTokenAlt = $derived(altTheme.colors[selectedTokenId]);

  function toggleGrayscalePreview(): void {
    manifest.alt.grayscalePreview = !manifest.alt.grayscalePreview;
    workspace.markPersistDirty();
  }

  const shortcuts = createPreviewShortcutController({
    cycleBorderPreviewMode,
    getActiveMode: () => activeMode,
    setActiveMode: (mode) => {
      activeMode = mode;
    },
    setMainTab: (tab) => {
      activeMainTab = tab;
    },
    toggleGrayscale: toggleGrayscalePreview
  });

  onMount(() => {
    const storedShellMode = localStorage.getItem('semantic-colors-shell-theme');
    if (storedShellMode === 'light' || storedShellMode === 'dark' || storedShellMode === 'alt') {
      shellMode = storedShellMode;
    }

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

  function setShellTheme(mode: ThemeMode): void {
    shellMode = mode;
    localStorage.setItem('semantic-colors-shell-theme', mode);
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
    manifest = ensureManifest(createDefaultManifest());
    selectedTokenId = 'surface';
  }

  function tokenLabel(tokenId: TokenId): string {
    return manifest.tokens[tokenId].label;
  }

  function toggleSidebar(): void {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function cycleBorderPreviewMode(): void {
    const nextIndex =
      (BORDER_PREVIEW_MODES.indexOf(borderPreviewMode) + 1) % BORDER_PREVIEW_MODES.length;
    borderPreviewMode = BORDER_PREVIEW_MODES[nextIndex];
  }
</script>

<svelte:window
  onblur={shortcuts.cancelHoldPreview}
  onkeydown={shortcuts.handleKeydown}
  onkeyup={shortcuts.handleKeyup}
/>

<svelte:head>
  <title>Semantic Colors</title>
</svelte:head>

<div
  class={`semantic-colors-app workspace ${sidebarCollapsed ? 'workspace-sidebar-collapsed' : ''}`}
  data-shell-theme={shellMode}
>
  <WorkspaceSaveToast
    {saveHeading}
    saveMessage={workspace.saveMessage}
    saveState={workspace.saveState}
    {saveToastTone}
  />

  <WorkspaceShellThemeBar {setShellTheme} {shellMode} />

  <WorkspaceSidebar
    bind:activeSidebarTab
    {activeMode}
    {addAlias}
    bind:config
    bind:configPath
    {confirmResetManifest}
    {currentTokenAlt}
    importProposal={workspace.importProposal}
    isImporting={workspace.isImporting}
    bind:importSelection={workspace.importSelection}
    bind:manifest
    markPersistDirty={workspace.markPersistDirty}
    onReloadProject={workspace.reloadProject}
    onRetrySave={workspace.retrySave}
    {removeAlias}
    {saveHeading}
    {saveHint}
    saveMessage={workspace.saveMessage}
    saveState={workspace.saveState}
    {selectedTokenId}
    {selectedTokenNotes}
    {setTheme}
    {sidebarCollapsed}
    {tokenLabel}
    {toggleSidebar}
    {updateAlias}
    {updateAltDelta}
    applyImportReview={workspace.applyImportReview}
    runImport={workspace.runImport}
  />

  <WorkspaceMainStage
    bind:activeMainTab
    {activeMode}
    borderPreviewLabel={borderPreviewLabelSync}
    {borderPreviewMode}
    currentThemeColors={currentTheme.colors}
    {cycleBorderPreviewMode}
    grayscalePreview={manifest.alt.grayscalePreview}
    {hasWarnings}
    {isSelectedUsage}
    saveMessage={workspace.saveMessage}
    saveState={workspace.saveState}
    {selectPreviewToken}
    {selectedTokenId}
    {previewStageStyle}
    {setTheme}
    {tokenLabel}
    {toggleGrayscalePreview}
    {warningSummary}
  />
</div>
