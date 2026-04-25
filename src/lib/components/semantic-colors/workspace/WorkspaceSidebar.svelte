<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import AliasPanel from '$lib/components/semantic-colors/AliasPanel.svelte';
  import ImportReview from '$lib/components/semantic-colors/ImportReview.svelte';
  import ModeControls from '$lib/components/semantic-colors/ModeControls.svelte';
  import ProjectPanel from '$lib/components/semantic-colors/ProjectPanel.svelte';
  import TokenEditor from '$lib/components/semantic-colors/TokenEditor.svelte';
  import {
    headerControlClass,
    SIDEBAR_TABS,
    type SidebarTabId
  } from '$lib/theme/workspace-page-constants';
  import type {
    ImportProposal,
    LocalAlias,
    OklchColor,
    ProjectConfig,
    ThemeManifest,
    ThemeMode,
    TokenId
  } from '$lib/theme/schema';
  import type { SaveState } from '$lib/theme/workspace-controller.svelte';

  interface WorkspaceSidebarProps {
    activeMode: ThemeMode;
    activeSidebarTab: SidebarTabId;
    addAlias: () => void;
    config: ProjectConfig;
    configPath: string;
    confirmResetManifest: () => void;
    currentTokenAlt: OklchColor;
    importProposal: ImportProposal | null;
    importSelection: Record<string, TokenId | ''>;
    isImporting: boolean;
    manifest: ThemeManifest;
    markPersistDirty: () => void;
    onReloadProject: () => void;
    onRetrySave: () => void;
    removeAlias: (index: number) => void;
    saveHeading: string;
    saveHint: string;
    saveMessage: string;
    saveState: SaveState;
    selectedTokenId: TokenId;
    selectedTokenNotes: string[];
    setTheme: (mode: ThemeMode) => void;
    sidebarCollapsed: boolean;
    tokenLabel: (tokenId: TokenId) => string;
    toggleSidebar: () => void;
    updateAlias: (index: number, patch: Partial<LocalAlias>) => void;
    updateAltDelta: (channel: 'l' | 'c' | 'h', value: number) => void;
    applyImportReview: () => void;
    runImport: () => void;
  }

  let {
    activeMode,
    activeSidebarTab = $bindable(),
    addAlias,
    config = $bindable(),
    configPath = $bindable(),
    confirmResetManifest,
    currentTokenAlt,
    importProposal,
    importSelection = $bindable(),
    isImporting,
    manifest = $bindable(),
    markPersistDirty,
    onReloadProject,
    onRetrySave,
    removeAlias,
    saveHeading,
    saveHint,
    saveMessage,
    saveState,
    selectedTokenId,
    selectedTokenNotes,
    setTheme,
    sidebarCollapsed,
    tokenLabel,
    toggleSidebar,
    updateAlias,
    updateAltDelta,
    applyImportReview,
    runImport
  }: WorkspaceSidebarProps = $props();
</script>

<aside class={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
  {#if sidebarCollapsed}
    <div class="sidebar-toolbar">
      <Button
        aria-label="Show authoring panels"
        class={`shrink-0 ${headerControlClass(false)}`}
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
      <Button
        aria-label="Hide authoring panels"
        class={`shrink-0 ${headerControlClass(false)}`}
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
          onPersistChange={markPersistDirty}
          {selectedTokenId}
          {selectedTokenNotes}
          {setTheme}
          {tokenLabel}
        />
      {:else if activeSidebarTab === 'modes'}
        <ModeControls
          bind:manifest
          onActivateAltPreview={() => setTheme('alt')}
          onPersistChange={markPersistDirty}
          {activeMode}
          {updateAltDelta}
        />
      {:else if activeSidebarTab === 'aliases'}
        <AliasPanel {addAlias} {manifest} {removeAlias} {tokenLabel} {updateAlias} />
      {:else if activeSidebarTab === 'import'}
        <ImportReview
          bind:config
          bind:importSelection
          {applyImportReview}
          {confirmResetManifest}
          {importProposal}
          {isImporting}
          onPersistChange={markPersistDirty}
          {runImport}
          {tokenLabel}
        />
      {:else if activeSidebarTab === 'project'}
        <ProjectPanel
          bind:config
          bind:configPath
          onPersistChange={markPersistDirty}
          {saveHeading}
          {saveHint}
          {saveMessage}
          {saveState}
          onReload={onReloadProject}
          {onRetrySave}
        />
      {/if}
    </div>
  {/if}
</aside>
