<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Kbd } from '$lib/components/ui/kbd';
  import FixtureStage from '$lib/components/semantic-colors/FixtureStage.svelte';
  import TokenInventory from '$lib/components/semantic-colors/TokenInventory.svelte';
  import {
    headerControlClass,
    headerShortcutClass,
    MAIN_TABS,
    type BorderPreviewMode,
    type MainTabId
  } from '$lib/theme/workspace-page-constants';
  import type { OklchColor, ThemeMode, TokenId } from '$lib/theme/schema';
  import type { SaveState } from '$lib/theme/workspace-controller.svelte';

  interface WorkspaceMainStageProps {
    activeMainTab: MainTabId;
    activeMode: ThemeMode;
    borderPreviewMode: BorderPreviewMode;
    borderPreviewLabel: string;
    currentThemeColors: Record<TokenId, OklchColor>;
    cycleBorderPreviewMode: () => void;
    grayscalePreview: boolean;
    hasWarnings: (tokenIds: TokenId[]) => boolean;
    isSelectedUsage: (tokenIds: TokenId[]) => boolean;
    saveMessage: string;
    saveState: SaveState;
    selectPreviewToken: (tokenId: TokenId) => void;
    selectedTokenId: TokenId;
    previewStageStyle: string;
    setTheme: (mode: ThemeMode) => void;
    tokenLabel: (tokenId: TokenId) => string;
    toggleGrayscalePreview: () => void;
    warningSummary: (tokenIds: TokenId[]) => string;
  }

  let {
    activeMainTab = $bindable(),
    activeMode,
    borderPreviewMode,
    borderPreviewLabel,
    currentThemeColors,
    cycleBorderPreviewMode,
    grayscalePreview,
    hasWarnings,
    isSelectedUsage,
    saveMessage,
    saveState,
    selectPreviewToken,
    selectedTokenId,
    previewStageStyle,
    setTheme,
    tokenLabel,
    toggleGrayscalePreview,
    warningSummary
  }: WorkspaceMainStageProps = $props();
</script>

<main class="stage-shell">
  <div
    class="stage-header-fixed rounded-t-none rounded-b-xl border-x border-t-0 border-b border-[color:var(--shell-color-border-subtle)] bg-[color:var(--shell-color-shell)] p-[var(--stage-header-pad-block-start)_1.1rem_1rem] text-[color:var(--shell-color-text)] shadow-[var(--shell-shadow)] backdrop-blur-xl"
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
            onclick={toggleGrayscalePreview}
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
        {saveMessage}
        {saveState}
        selectToken={selectPreviewToken}
        {selectedTokenId}
        stageStyle={previewStageStyle}
        {tokenLabel}
        {warningSummary}
      />
    {:else}
      <TokenInventory
        currentColors={currentThemeColors}
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
