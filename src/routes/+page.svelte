<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import { Kbd } from '$lib/components/ui/kbd';
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
    { id: 'token', label: 'Token' },
    { id: 'modes', label: 'Alt' },
    { id: 'aliases', label: 'Aliases' },
    { id: 'import', label: 'Import' },
    { id: 'project', label: 'Project' }
  ] as const;
  const MAIN_TABS = [
    { id: 'preview', label: 'Preview' },
    { id: 'inventory', label: 'Tokens' }
  ] as const;
  const BORDER_PREVIEW_MODES = ['none', 'border', 'border-subtle', 'border-strong'] as const;
  const BORDER_PREVIEW_LABELS = {
    none: 'No Border',
    border: 'Border',
    'border-subtle': 'Border Subtle',
    'border-strong': 'Border Strong'
  } as const;

  type SidebarTabId = (typeof SIDEBAR_TABS)[number]['id'];
  type MainTabId = (typeof MAIN_TABS)[number]['id'];
  type BorderPreviewMode = (typeof BORDER_PREVIEW_MODES)[number];

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
  let grayscalePreview = $state(false);
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

  function applyPageData(value: PageData): void {
    manifest = ensureManifest(value.manifest);
    grayscalePreview = value.manifest.alt.grayscalePreview;
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
  const borderPreviewLabel = $derived(BORDER_PREVIEW_LABELS[borderPreviewMode]);
  const previewStageStyle = $derived(
    `${stageStyle}  --preview-border-color: ${borderPreviewMode === 'none' ? 'transparent' : `var(--theme-${borderPreviewMode})`};\n  --preview-border-width: 1px;\n`
  );
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

    if (event.key.toLowerCase() === 'p') {
      activeMainTab = 'preview';
      return;
    }

    if (event.key.toLowerCase() === 't') {
      activeMainTab = 'inventory';
      return;
    }

    if (event.key.toLowerCase() === 'g') {
      grayscalePreview = !grayscalePreview;
      return;
    }

    if (event.key.toLowerCase() === 'b') {
      cycleBorderPreviewMode();
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
    grayscalePreview = manifest.alt.grayscalePreview;
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

  function headerControlClass(selected: boolean): string {
    return selected
      ? 'border-sky-500/35 bg-sky-500/12 text-slate-950 shadow-[0_0_0_3px_rgba(59,130,246,0.12)] hover:bg-sky-500/16'
      : 'border-slate-900/10 bg-white/70 text-slate-900 shadow-none hover:bg-white';
  }

  function headerShortcutClass(selected: boolean): string {
    return selected
      ? 'border-sky-200 bg-white/85 text-sky-900'
      : 'border-black/10 bg-white/70 text-slate-500';
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
    {#if sidebarCollapsed}
      <div class="sidebar-toolbar">
        <Button
          aria-label="Show authoring panels"
          class="shrink-0 border-slate-900/10 bg-white/70 shadow-none hover:bg-white"
          onclick={toggleSidebar}
          size="icon"
          variant="outline"
        >
          <span aria-hidden="true" class="sidebar-toggle-icon sidebar-toggle-icon-collapsed">
            <svg class="sidebar-toggle-chevron" viewBox="0 0 24 24">
              <path
                d="M14.5 7.5L9 12l5.5 4.5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
              />
            </svg>
          </span>
        </Button>
      </div>
    {:else}
      <div class="flex w-full min-w-0 items-center gap-2">
        <div
          class="flex min-w-0 flex-1 flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Authoring panels: token, alt modes, aliases, import, project"
        >
          {#each SIDEBAR_TABS as tab (tab.id)}
            <Button
              aria-controls="sidebar-authoring-panel"
              aria-label={`${tab.label} panel`}
              aria-pressed={activeSidebarTab === tab.id}
              class={`h-9 min-h-9 px-3 ${headerControlClass(activeSidebarTab === tab.id)}`}
              onclick={() => {
                activeSidebarTab = tab.id;
              }}
              variant="outline"
            >
              {tab.label}
            </Button>
          {/each}
        </div>
        <Button
          aria-label="Hide authoring panels"
          class="shrink-0 border-slate-900/10 bg-white/70 shadow-none hover:bg-white"
          onclick={toggleSidebar}
          size="icon"
          variant="outline"
        >
          <span aria-hidden="true" class="sidebar-toggle-icon">
            <svg class="sidebar-toggle-chevron" viewBox="0 0 24 24">
              <path
                d="M14.5 7.5L9 12l5.5 4.5"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
              />
            </svg>
          </span>
        </Button>
      </div>

      <div
        class="sidebar-panel-shell"
        id="sidebar-authoring-panel"
        role="tabpanel"
        aria-label={SIDEBAR_TABS.find((t) => t.id === activeSidebarTab)?.label}
      >
        {#if activeSidebarTab === 'token'}
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
        {:else if activeSidebarTab === 'modes'}
          <ModeControls
            bind:manifest
            onActivateAltPreview={() => setTheme('alt')}
            onPersistChange={workspace.markPersistDirty}
            {activeMode}
            {updateAltDelta}
          />
        {:else if activeSidebarTab === 'aliases'}
          <AliasPanel {addAlias} {manifest} {removeAlias} {tokenLabel} {updateAlias} />
        {:else if activeSidebarTab === 'import'}
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
        {:else if activeSidebarTab === 'project'}
          <ProjectPanel
            bind:config
            bind:configPath
            onPersistChange={workspace.markPersistDirty}
            {saveHeading}
            {saveHint}
            saveMessage={workspace.saveMessage}
            saveState={workspace.saveState}
            onReload={workspace.reloadProject}
            onRetrySave={workspace.retrySave}
          />
        {/if}
      </div>
    {/if}
  </aside>

  <main class="stage-shell">
    <div
      class="stage-header-fixed rounded-b-xl rounded-t-none border-x border-b border-t-0 border-[color:var(--shell-border)] bg-white/90 p-[var(--stage-header-pad-block-start)_1.1rem_1rem] shadow-[var(--shell-shadow)] backdrop-blur-xl"
    >
      <div
        class="stage-header-toolbar flex w-full min-w-0 flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Stage: viewport, preview tools, and theme mode"
      >
        <div class="flex shrink-0 flex-wrap items-center gap-2">
          {#each MAIN_TABS as tab (tab.id)}
            <Button
              aria-controls="main-viewport-panel"
              aria-keyshortcuts={tab.id === 'preview' ? 'P' : 'T'}
              aria-label={`${tab.label} view${tab.id === 'preview' ? ' (shortcut P)' : ' (shortcut T)'}`}
              aria-pressed={activeMainTab === tab.id}
              class={headerControlClass(activeMainTab === tab.id)}
              onclick={() => {
                activeMainTab = tab.id;
              }}
              variant="outline"
            >
              <span>{tab.label}</span>
              <Kbd class={headerShortcutClass(activeMainTab === tab.id)}
                >{tab.id === 'preview' ? 'P' : 'T'}</Kbd
              >
            </Button>
          {/each}
        </div>

        <div class="stage-header-toolbar-end flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <Button
              aria-keyshortcuts="B"
              aria-label={`Border preview mode: ${borderPreviewLabel} (shortcut B)`}
              aria-pressed={borderPreviewMode !== 'none'}
              class={headerControlClass(borderPreviewMode !== 'none')}
              onclick={cycleBorderPreviewMode}
              variant="outline"
            >
              <span>{borderPreviewLabel}</span>
              <Kbd class={headerShortcutClass(borderPreviewMode !== 'none')}>B</Kbd>
            </Button>
            <Button
              aria-keyshortcuts="G"
              aria-label="Grayscale preview (shortcut G)"
              aria-pressed={grayscalePreview}
              class={headerControlClass(grayscalePreview)}
              onclick={() => {
                grayscalePreview = !grayscalePreview;
              }}
              variant="outline"
            >
              <span>Grayscale</span>
              <Kbd class={headerShortcutClass(grayscalePreview)}>G</Kbd>
            </Button>
          </div>

          <div
            class="stage-header-toolbar-divider"
            role="separator"
            aria-orientation="vertical"
            aria-hidden="true"
          ></div>

          <div class="flex flex-wrap items-center gap-2">
            <Button
              aria-keyshortcuts="1"
              aria-pressed={activeMode === 'light'}
              class={headerControlClass(activeMode === 'light')}
              onclick={() => setTheme('light')}
              variant="outline"
            >
              <span>Light</span>
              <Kbd class={headerShortcutClass(activeMode === 'light')}>1</Kbd>
            </Button>
            <Button
              aria-keyshortcuts="2"
              aria-pressed={activeMode === 'dark'}
              class={headerControlClass(activeMode === 'dark')}
              onclick={() => setTheme('dark')}
              variant="outline"
            >
              <span>Dark</span>
              <Kbd class={headerShortcutClass(activeMode === 'dark')}>2</Kbd>
            </Button>
            <Button
              aria-keyshortcuts="3"
              aria-pressed={activeMode === 'alt'}
              class={headerControlClass(activeMode === 'alt')}
              onclick={() => setTheme('alt')}
              variant="outline"
            >
              <span>Alt</span>
              <Kbd class={headerShortcutClass(activeMode === 'alt')}>3</Kbd>
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="stage-content-shell"
      id="main-viewport-panel"
      role="region"
      aria-label={activeMainTab === 'preview' ? 'Fixture preview' : 'Token inventory'}
    >
      {#if activeMainTab === 'preview'}
        <FixtureStage
          {activeMode}
          {grayscalePreview}
          {hasWarnings}
          {isSelectedUsage}
          saveMessage={workspace.saveMessage}
          saveState={workspace.saveState}
          selectToken={selectPreviewToken}
          {selectedTokenId}
          stageStyle={previewStageStyle}
          {tokenLabel}
          {warningSummary}
        />
      {:else}
        <TokenInventory
          currentColors={currentTheme.colors}
          {grayscalePreview}
          {hasWarnings}
          {isSelectedUsage}
          selectToken={selectPreviewToken}
          {selectedTokenId}
          stageStyle={previewStageStyle}
          {tokenLabel}
          {warningSummary}
        />
      {/if}
    </div>
  </main>
</div>
