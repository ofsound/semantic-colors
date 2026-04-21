<script lang="ts">
  import { onMount } from 'svelte';
  import { themeCssVariables, resolveTheme, summarizeTokenValidation, validateManifest } from '$lib/theme/engine';
  import { ensureManifest } from '$lib/theme/engine';
  import { createDefaultManifest } from '$lib/theme/defaults';
  import { ALL_TOKEN_IDS, DEFAULT_PROJECT_CONFIG, TOKEN_GROUP_ORDER, TOKENS_BY_GROUP } from '$lib/theme/schema';
  import type {
    ImportProposal,
    LocalAlias,
    ProjectConfig,
    ThemeManifest,
    ThemeMode,
    TokenId
  } from '$lib/theme/schema';
  import { toCssColor } from '$lib/theme/color';

  type PageData = {
    configPath: string;
    config: ProjectConfig;
    manifest: ThemeManifest;
  };

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
  const currentTheme = $derived(activeMode === 'light' ? lightTheme : activeMode === 'dark' ? darkTheme : altTheme);
  const validations = $derived(validateManifest(manifest));
  const selectedToken = $derived(manifest.tokens[selectedTokenId]);
  const selectedTokenValidation = $derived(validations[activeMode].perToken[selectedTokenId]);
  const stageStyle = $derived(`${themeCssVariables(currentTheme)}\n`);
  const currentTokenAlt = $derived(altTheme.colors[selectedTokenId]);

  async function reloadProject(): Promise<void> {
    const response = await fetch(`/api/project/load?configPath=${encodeURIComponent(configPath)}`);
    const nextData = (await response.json()) as PageData;
    applyPageData(nextData);
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
        throw new Error(`Save failed with status ${response.status}`);
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

  $effect(() => {
    JSON.stringify($state.snapshot(manifest));
    JSON.stringify($state.snapshot(config));
    configPath;

    if (!booted) {
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      void persistState();
    }, 500);
  });

  $effect(() => {
    document.documentElement.dataset.theme = activeMode;
  });

  onMount(() => {
    booted = true;
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  });

  function isSelectedUsage(tokenIds: TokenId[]): boolean {
    return tokenIds.includes(selectedTokenId);
  }

  function hasWarnings(tokenIds: TokenId[]): boolean {
    return tokenIds.some((tokenId) => summarizeTokenValidation(validations[activeMode].perToken[tokenId]).length > 0);
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
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
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
        throw new Error(`Import failed with status ${response.status}`);
      }

      importProposal = (await response.json()) as ImportProposal;
      importSelection = Object.fromEntries(
        importProposal.candidates.map((candidate) => [candidate.sourceName, candidate.suggestedTokenId ?? ''])
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

  const textInventory = TOKENS_BY_GROUP.text;
  const borderInventory = TOKENS_BY_GROUP.borders;
  const accentInventory = TOKENS_BY_GROUP.accent;
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<svelte:head>
  <title>Semantic Colors</title>
</svelte:head>

<div class="workspace">
  <aside class="sidebar">
    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Project bridge</p>
          <h1>Trimodal Semantic Engine</h1>
        </div>
        <button class="ghost-button" onclick={reloadProject}>Reload</button>
      </div>

      <label class="field-block">
        <span>Project config path</span>
        <input bind:value={configPath} />
      </label>

      <label class="field-block">
        <span>Project root</span>
        <input bind:value={config.projectRoot} placeholder="/absolute/path/to/project" />
      </label>

      <div class="field-grid">
        <label class="field-block">
          <span>Manifest path</span>
          <input bind:value={config.manifestPath} />
        </label>
        <label class="field-block">
          <span>CSS output path</span>
          <input bind:value={config.cssOutputPath} />
        </label>
      </div>

      <label class="checkbox-row">
        <input bind:checked={config.bridgeEnabled} type="checkbox" />
        <span>Write generated CSS into the target project</span>
      </label>

      <div class={`save-state save-state-${saveState}`}>
        <strong>{saveState === 'saving' ? 'Autosaving' : saveState === 'error' ? 'Error' : 'State'}</strong>
        <span>{saveMessage}</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Theme state</p>
          <h2>Mode controls</h2>
        </div>
      </div>

      <div class="mode-row">
        <button class:active={activeMode === 'light'} onclick={() => setTheme('light')}>1 Light</button>
        <button class:active={activeMode === 'dark'} onclick={() => setTheme('dark')}>2 Dark</button>
        <button class:active={activeMode === 'alt'} onclick={() => setTheme('alt')}>3 Alt</button>
      </div>

      <label class="checkbox-row">
        <input bind:checked={manifest.alt.grayscalePreview} type="checkbox" />
        <span>Greyscale hierarchy overlay (`L`)</span>
      </label>

      <div class="field-grid alt-grid">
        <label class="field-block">
          <span>Alt base</span>
          <select bind:value={manifest.alt.source}>
            <option value="light">Derive from Light</option>
            <option value="dark">Derive from Dark</option>
          </select>
        </label>
        <label class="checkbox-row compact">
          <input bind:checked={manifest.alt.harmonyLock} type="checkbox" />
          <span>Lock harmony</span>
        </label>
      </div>

      <div class={`mode-block ${activeMode === 'alt' ? 'mode-block-promoted' : ''}`}>
        <div class="slider-row">
          <span>Hue shift</span>
          <input
            max="180"
            min="-180"
            step="1"
            type="range"
            value={manifest.alt.delta.h}
            oninput={(event) => updateAltDelta('h', Number((event.currentTarget as HTMLInputElement).value))}
          />
          <input
            class="number-field"
            max="180"
            min="-180"
            step="1"
            type="number"
            bind:value={manifest.alt.delta.h}
          />
        </div>

        <div class="slider-row">
          <span>Chroma shift</span>
          <input
            max="0.16"
            min="-0.16"
            step="0.005"
            type="range"
            value={manifest.alt.delta.c}
            oninput={(event) => updateAltDelta('c', Number((event.currentTarget as HTMLInputElement).value))}
          />
          <input
            class="number-field"
            max="0.16"
            min="-0.16"
            step="0.005"
            type="number"
            bind:value={manifest.alt.delta.c}
          />
        </div>

        <div class="slider-row">
          <span>Lightness shift</span>
          <input
            max="0.2"
            min="-0.2"
            step="0.01"
            type="range"
            value={manifest.alt.delta.l}
            oninput={(event) => updateAltDelta('l', Number((event.currentTarget as HTMLInputElement).value))}
          />
          <input
            class="number-field"
            max="0.2"
            min="-0.2"
            step="0.01"
            type="number"
            bind:value={manifest.alt.delta.l}
          />
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Token editor</p>
          <h2>{selectedToken.label}</h2>
        </div>
        <span class="token-group">{selectedToken.group}</span>
      </div>

      <p class="description">{selectedToken.description}</p>

      <div class="swatch-row">
        <button class="swatch-card" onclick={() => setTheme('light')}>
          <span>Light</span>
          <span class="swatch" style={`background:${toCssColor(selectedToken.light)}`}></span>
          <code>{toCssColor(selectedToken.light)}</code>
        </button>
        <button class="swatch-card" onclick={() => setTheme('dark')}>
          <span>Dark</span>
          <span class="swatch" style={`background:${toCssColor(selectedToken.dark)}`}></span>
          <code>{toCssColor(selectedToken.dark)}</code>
        </button>
        <button class="swatch-card" onclick={() => setTheme('alt')}>
          <span>Alt</span>
          <span class="swatch" style={`background:${toCssColor(currentTokenAlt)}`}></span>
          <code>{toCssColor(currentTokenAlt)}</code>
        </button>
      </div>

      <div class={`anchor-editor ${activeMode === 'light' ? 'anchor-editor-active' : ''}`}>
        <div class="anchor-header">
          <strong>Light anchor</strong>
          <span>{activeMode === 'light' ? 'Editing focus' : 'Anchor remains inspectable'}</span>
        </div>
        <div class="channel-grid">
          <label class="channel">
            <span>L</span>
            <input
              max="1"
              min="0"
              step="0.005"
              type="range"
              bind:value={selectedToken.light.l}
            />
            <input class="number-field" max="1" min="0" step="0.005" type="number" bind:value={selectedToken.light.l} />
          </label>
          <label class="channel">
            <span>C</span>
            <input
              max="0.37"
              min="0"
              step="0.005"
              type="range"
              bind:value={selectedToken.light.c}
            />
            <input class="number-field" max="0.37" min="0" step="0.005" type="number" bind:value={selectedToken.light.c} />
          </label>
          <label class="channel">
            <span>H</span>
            <input
              max="360"
              min="0"
              step="1"
              type="range"
              bind:value={selectedToken.light.h}
            />
            <input class="number-field" max="360" min="0" step="1" type="number" bind:value={selectedToken.light.h} />
          </label>
        </div>
      </div>

      <div class={`anchor-editor ${activeMode === 'dark' ? 'anchor-editor-active' : ''}`}>
        <div class="anchor-header">
          <strong>Dark anchor</strong>
          <span>{activeMode === 'dark' ? 'Editing focus' : 'Anchor remains inspectable'}</span>
        </div>
        <div class="channel-grid">
          <label class="channel">
            <span>L</span>
            <input
              max="1"
              min="0"
              step="0.005"
              type="range"
              bind:value={selectedToken.dark.l}
            />
            <input class="number-field" max="1" min="0" step="0.005" type="number" bind:value={selectedToken.dark.l} />
          </label>
          <label class="channel">
            <span>C</span>
            <input
              max="0.37"
              min="0"
              step="0.005"
              type="range"
              bind:value={selectedToken.dark.c}
            />
            <input class="number-field" max="0.37" min="0" step="0.005" type="number" bind:value={selectedToken.dark.c} />
          </label>
          <label class="channel">
            <span>H</span>
            <input
              max="360"
              min="0"
              step="1"
              type="range"
              bind:value={selectedToken.dark.h}
            />
            <input class="number-field" max="360" min="0" step="1" type="number" bind:value={selectedToken.dark.h} />
          </label>
        </div>
      </div>

      <div class={`mode-block ${activeMode === 'alt' ? 'mode-block-promoted' : ''}`}>
        <div class="field-grid">
          <label class="field-block">
            <span>Alt behavior</span>
            <select bind:value={selectedToken.exception.altBehavior}>
              <option value="derive">Derive</option>
              <option value="pin">Pin to source anchor</option>
              <option value="exclude">Exclude from Alt</option>
            </select>
          </label>
          <label class="field-block">
            <span>Max chroma</span>
            <input bind:value={selectedToken.exception.maxChroma} max="0.37" min="0" step="0.005" type="number" />
          </label>
        </div>

        {#if selectedToken.altParent}
          <p class="microcopy">Alt derives from parent token: <strong>{tokenLabel(selectedToken.altParent)}</strong></p>
        {/if}
      </div>

      <div class="validation-list">
        <p class="eyebrow">Validation</p>
        {#if summarizeTokenValidation(selectedTokenValidation).length === 0}
          <p class="validation-ok">No warnings for this token in {activeMode} mode.</p>
        {:else}
          {#each summarizeTokenValidation(selectedTokenValidation) as note (note)}
            <p class="validation-issue">{note}</p>
          {/each}
        {/if}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Local aliases</p>
          <h2>Project-specific names</h2>
        </div>
        <button class="ghost-button" onclick={addAlias}>Add alias</button>
      </div>

      <div class="alias-list">
        {#each manifest.aliases as alias, index (`${alias.name}-${index}`)}
          <div class="alias-row">
            <input bind:value={alias.name} oninput={(event) => updateAlias(index, { name: (event.currentTarget as HTMLInputElement).value })} />
            <select bind:value={alias.tokenId} oninput={(event) => updateAlias(index, { tokenId: (event.currentTarget as HTMLSelectElement).value as TokenId })}>
              {#each ALL_TOKEN_IDS as tokenId}
                <option value={tokenId}>{tokenLabel(tokenId)}</option>
              {/each}
            </select>
            <button class="ghost-button" onclick={() => removeAlias(index)}>Remove</button>
          </div>
        {/each}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Import and migration</p>
          <h2>CSS review queue</h2>
        </div>
        <button class="ghost-button" onclick={resetManifest}>Reset manifest</button>
      </div>

      <label class="field-block">
        <span>Source CSS path</span>
        <input bind:value={config.importSourcePath} placeholder="../project/src/app.css" />
      </label>

      <div class="action-row">
        <button disabled={isImporting || !config.importSourcePath} onclick={runImport}>
          {isImporting ? 'Importing...' : 'Scan CSS variables'}
        </button>
        {#if importProposal}
          <button class="secondary-button" onclick={applyImportReview}>Apply reviewed mappings</button>
        {/if}
      </div>

      {#if importProposal}
        <div class="review-queue">
          {#each importProposal.candidates as candidate (candidate.sourceName)}
            <article class="review-card">
              <div>
                <strong>--{candidate.sourceName}</strong>
                <p>{candidate.rawValue}</p>
                <small>{candidate.reason}</small>
              </div>
              <select bind:value={importSelection[candidate.sourceName]}>
                <option value="">Skip mapping</option>
                {#each ALL_TOKEN_IDS as tokenId (tokenId)}
                  <option value={tokenId}>{tokenLabel(tokenId)}</option>
                {/each}
              </select>
              <div class="review-swatches">
                <span class="mini-swatch" style={`background:${candidate.light ? toCssColor(candidate.light) : 'transparent'}`}>L</span>
                <span class="mini-swatch" style={`background:${candidate.dark ? toCssColor(candidate.dark) : 'transparent'}`}>D</span>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </aside>

  <main class="stage-shell">
    <header class="stage-header">
      <div>
        <p class="eyebrow">Preview harness</p>
        <h2>Standalone fixture app + live token inventory</h2>
      </div>
      <div class="stage-meta">
        <span>Mode: {activeMode}</span>
        <span>Selected: {selectedToken.label}</span>
      </div>
    </header>

    <section
      class:grayscale={manifest.alt.grayscalePreview}
      class="stage"
      data-theme={activeMode}
      style={stageStyle}
    >
      <div class="hero-grid">
        <button
          class:selected-usage={isSelectedUsage(['app'])}
          class:warning={hasWarnings(['app'])}
          class="surface-card surface-card-app"
          onclick={() => selectToken('app')}
        >
          <span class="fixture-label">App background</span>
          <small>{tokenLabel('app')}</small>
        </button>

        <button
          class:selected-usage={isSelectedUsage(['shell'])}
          class:warning={hasWarnings(['shell'])}
          class="surface-card surface-card-shell"
          onclick={() => selectToken('shell')}
        >
          <span class="fixture-label">Shell</span>
          <small>{tokenLabel('shell')}</small>
        </button>

        <div
          class:selected-usage={isSelectedUsage(['surface', 'surface-raised', 'border', 'text'])}
          class:warning={hasWarnings(['surface', 'surface-raised', 'border', 'text'])}
          class="surface-card surface-card-panel"
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectToken('surface');
            }
          }}
          onclick={() => selectToken('surface')}
          role="button"
          tabindex="0"
        >
          <span class="fixture-label">Primary surface</span>
          <h3>Depth stack</h3>
          <p>Use the preview to judge visual weight in-place while themes swap.</p>
          <div class="inner-stack">
            <button
              class:selected-usage={isSelectedUsage(['surface-raised'])}
              class="nested-surface"
              onclick={() => selectToken('surface-raised')}
            >
              Raised
            </button>
            <button
              class:selected-usage={isSelectedUsage(['surface-muted'])}
              class="nested-surface nested-muted"
              onclick={() => selectToken('surface-muted')}
            >
              Muted
            </button>
            <button
              class:selected-usage={isSelectedUsage(['surface-subtle'])}
              class="nested-surface nested-subtle"
              onclick={() => selectToken('surface-subtle')}
            >
              Subtle
            </button>
            <button
              class:selected-usage={isSelectedUsage(['field', 'input'])}
              class="nested-surface nested-field"
              onclick={() => selectToken('field')}
            >
              Field
            </button>
          </div>
        </div>
      </div>

      <div class="fixture-grid">
        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Text hierarchy</h3>
            <span>Primary, secondary, muted, faint, inverse</span>
          </div>
          <div class="text-stack">
            {#each textInventory as tokenId (tokenId)}
              <button
                class:selected-usage={isSelectedUsage([tokenId])}
                class:warning={hasWarnings([tokenId])}
                class={`text-sample text-sample-${tokenId}`}
                onclick={() => selectToken(tokenId)}
              >
                <span>{tokenLabel(tokenId)}</span>
                <strong>The quick brown fox jumps over the lazy dog.</strong>
              </button>
            {/each}
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Accent and links</h3>
            <span>Interactive emphasis and tinting</span>
          </div>
          <div class="accent-grid">
            {#each accentInventory as tokenId (tokenId)}
              <button
                class:selected-usage={isSelectedUsage([tokenId])}
                class:warning={hasWarnings([tokenId])}
                class={`accent-sample accent-sample-${tokenId}`}
                onclick={() => selectToken(tokenId)}
              >
                <span>{tokenLabel(tokenId)}</span>
              </button>
            {/each}
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Status pairs</h3>
            <span>Surface + text combinations</span>
          </div>
          <div class="status-grid">
            {#each ['success', 'warning', 'danger', 'info'] as stem (stem)}
              <button
                class:selected-usage={isSelectedUsage([stem as TokenId, `${stem}-surface` as TokenId])}
                class:warning={hasWarnings([stem as TokenId, `${stem}-surface` as TokenId])}
                class={`status-card status-card-${stem}`}
                onclick={() => selectToken(stem as TokenId)}
              >
                <strong>{stem}</strong>
                <span>{tokenLabel(stem as TokenId)}</span>
              </button>
            {/each}
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Controls</h3>
            <span>Primary, secondary, ghost, and field states</span>
          </div>
          <div class="control-grid">
            <button
              class:selected-usage={isSelectedUsage(['control-primary', 'control-primary-text'])}
              class:warning={hasWarnings(['control-primary', 'control-primary-text'])}
              class="control-primary"
              onclick={() => selectToken('control-primary')}
            >
              Primary action
            </button>
            <button
              class:selected-usage={isSelectedUsage(['control-secondary', 'control-secondary-border', 'control-secondary-text'])}
              class:warning={hasWarnings(['control-secondary', 'control-secondary-border', 'control-secondary-text'])}
              class="control-secondary"
              onclick={() => selectToken('control-secondary')}
            >
              Secondary
            </button>
            <button
              class:selected-usage={isSelectedUsage(['control-ghost-hover'])}
              class:warning={hasWarnings(['control-ghost-hover'])}
              class="control-ghost"
              onclick={() => selectToken('control-ghost-hover')}
            >
              Ghost hover
            </button>
            <label
              class:selected-usage={isSelectedUsage(['input', 'input-border', 'input-placeholder'])}
              class:warning={hasWarnings(['input', 'input-border', 'input-placeholder'])}
              class="input-preview"
            >
              <span>Input field</span>
              <input placeholder="Input placeholder" onclick={() => selectToken('input')} />
            </label>
          </div>
        </article>

        <article class="fixture-panel">
          <div class="fixture-panel-header">
            <h3>Borders and focus</h3>
            <span>Quiet, default, strong, and focus treatments</span>
          </div>
          <div class="border-grid">
            {#each borderInventory as tokenId (tokenId)}
              <button
                class:selected-usage={isSelectedUsage([tokenId])}
                class:warning={hasWarnings([tokenId])}
                class={`border-sample border-sample-${tokenId}`}
                onclick={() => selectToken(tokenId)}
              >
                {tokenLabel(tokenId)}
              </button>
            {/each}
          </div>
        </article>

        <article class="fixture-panel fixture-panel-overlay">
          <div class="fixture-panel-header">
            <h3>Overlay and scrim</h3>
            <span>Shared overlay pattern with only core tokens</span>
          </div>
          <div class="overlay-demo">
            <div class="scrim"></div>
            <button
              class:selected-usage={isSelectedUsage(['surface-overlay', 'text', 'border'])}
              class:warning={hasWarnings(['surface-overlay', 'text', 'border'])}
              class="overlay-card"
              onclick={() => selectToken('surface-overlay')}
            >
              <strong>Overlay surface</strong>
              <p>Modal, popover, or detached chrome should read from the same semantic surface.</p>
            </button>
          </div>
        </article>
      </div>

      <article class="inventory">
        <div class="fixture-panel-header">
          <h3>Token inventory</h3>
          <span>Every shared token is visible and selectable here.</span>
        </div>
        {#each TOKEN_GROUP_ORDER as group (group)}
          <div class="inventory-group">
            <div class="inventory-group-header">
              <h4>{group}</h4>
              <span>{TOKENS_BY_GROUP[group].length} tokens</span>
            </div>
            <div class="inventory-grid">
              {#each TOKENS_BY_GROUP[group] as tokenId (tokenId)}
                <button
                  class:selected-usage={isSelectedUsage([tokenId])}
                  class:warning={hasWarnings([tokenId])}
                  class="inventory-card"
                  onclick={() => selectToken(tokenId)}
                >
                  <span class="inventory-swatch" style={`background:${toCssColor(currentTheme.colors[tokenId])}`}></span>
                  <span class="inventory-title">{tokenLabel(tokenId)}</span>
                  <code>{tokenId}</code>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </article>
    </section>
  </main>
</div>

<style>
  :global(body) {
    background:
      radial-gradient(circle at top left, rgba(32, 143, 252, 0.16), transparent 22%),
      linear-gradient(180deg, #f6f7fb, #edeff6);
    color: #111827;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(22rem, 30rem) 1fr;
    min-height: 100dvh;
    gap: 1.25rem;
    padding: 1.25rem;
  }

  .sidebar,
  .stage-shell {
    min-height: 0;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .panel,
  .stage-header,
  .inventory,
  .fixture-panel {
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1.25rem;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 40px -28px rgba(15, 23, 42, 0.25);
  }

  .panel {
    padding: 1rem;
  }

  .panel-header,
  .fixture-panel-header,
  .stage-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  h1 {
    font-size: 1.3rem;
  }

  h2 {
    font-size: 1.05rem;
  }

  .eyebrow {
    margin-bottom: 0.3rem;
    color: #4b5563;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .description,
  .microcopy,
  small {
    color: #4b5563;
  }

  .field-block,
  .channel,
  .checkbox-row {
    display: grid;
    gap: 0.45rem;
  }

  .field-grid,
  .channel-grid,
  .swatch-row,
  .action-row,
  .mode-row,
  .control-grid,
  .border-grid,
  .accent-grid,
  .status-grid,
  .hero-grid {
    display: grid;
    gap: 0.75rem;
  }

  .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .alt-grid {
    align-items: end;
  }

  .channel-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mode-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  input,
  select,
  button {
    border: 1px solid rgba(15, 23, 42, 0.12);
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.95);
    color: inherit;
  }

  input,
  select {
    width: 100%;
    padding: 0.68rem 0.8rem;
  }

  input[type='range'] {
    padding: 0;
  }

  button {
    cursor: pointer;
    padding: 0.7rem 0.9rem;
    transition:
      transform 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      background 140ms ease;
  }

  button:hover {
    transform: translateY(-1px);
    border-color: rgba(59, 130, 246, 0.35);
  }

  .ghost-button,
  .secondary-button {
    background: rgba(255, 255, 255, 0.55);
  }

  .mode-row button.active {
    background: linear-gradient(135deg, #111827, #334155);
    color: white;
  }

  .save-state {
    display: grid;
    gap: 0.25rem;
    margin-top: 0.9rem;
    padding: 0.8rem;
    border-radius: 1rem;
    background: rgba(15, 23, 42, 0.04);
  }

  .save-state-saving {
    background: rgba(59, 130, 246, 0.08);
  }

  .save-state-error {
    background: rgba(239, 68, 68, 0.09);
  }

  .token-group {
    padding: 0.35rem 0.55rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.08);
    font-size: 0.76rem;
    text-transform: capitalize;
  }

  .swatch-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 0.8rem;
  }

  .swatch-card {
    display: grid;
    gap: 0.5rem;
    text-align: left;
  }

  .swatch {
    height: 2.5rem;
    border-radius: 0.8rem;
    border: 1px solid rgba(15, 23, 42, 0.12);
  }

  .swatch-card code {
    font-size: 0.66rem;
    color: #4b5563;
    word-break: break-word;
  }

  .anchor-editor,
  .mode-block {
    margin-top: 0.95rem;
    padding: 0.85rem;
    border-radius: 1rem;
    background: rgba(15, 23, 42, 0.04);
  }

  .anchor-editor-active,
  .mode-block-promoted {
    border: 1px solid rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.07);
  }

  .anchor-header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.8rem;
  }

  .number-field {
    min-width: 0;
  }

  .slider-row {
    display: grid;
    grid-template-columns: 5rem 1fr 5rem;
    gap: 0.75rem;
    align-items: center;
  }

  .validation-list {
    margin-top: 1rem;
  }

  .validation-ok {
    color: #047857;
  }

  .validation-issue {
    color: #991b1b;
  }

  .alias-list,
  .review-queue {
    display: grid;
    gap: 0.75rem;
  }

  .alias-row,
  .review-card {
    display: grid;
    gap: 0.75rem;
    padding: 0.8rem;
    border-radius: 1rem;
    background: rgba(15, 23, 42, 0.04);
  }

  .alias-row {
    grid-template-columns: 1.4fr 1fr auto;
    align-items: center;
  }

  .review-card {
    grid-template-columns: 1.3fr 1fr auto;
    align-items: center;
  }

  .review-card p {
    margin-top: 0.25rem;
    color: #4b5563;
    font-size: 0.82rem;
  }

  .review-swatches {
    display: flex;
    gap: 0.4rem;
  }

  .mini-swatch {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.7rem;
    border: 1px solid rgba(15, 23, 42, 0.12);
    font-size: 0.7rem;
    font-weight: 700;
  }

  .stage-shell {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    min-height: 0;
  }

  .stage-header {
    padding: 1rem 1.1rem;
    align-items: center;
  }

  .stage-meta {
    display: flex;
    gap: 0.8rem;
    color: #4b5563;
    font-size: 0.85rem;
  }

  .stage {
    overflow-y: auto;
    padding: 1.1rem;
    border-radius: 1.5rem;
    background: var(--theme-app);
    color: var(--theme-text);
    transition:
      background-color 160ms ease,
      color 160ms ease,
      filter 160ms ease;
  }

  .stage.grayscale {
    filter: grayscale(1);
  }

  .hero-grid {
    grid-template-columns: 0.7fr 0.7fr 1.3fr;
    margin-bottom: 1rem;
  }

  .surface-card,
  .fixture-panel,
  .inventory {
    color: inherit;
  }

  .surface-card {
    min-height: 10rem;
    display: grid;
    align-content: start;
    gap: 0.45rem;
    padding: 1rem;
    border-radius: 1.25rem;
    border: 1px solid var(--theme-border);
    box-shadow: 0 20px 40px -30px rgba(15, 23, 42, 0.45);
  }

  .surface-card-app {
    background: var(--theme-app);
  }

  .surface-card-shell {
    background: var(--theme-shell);
  }

  .surface-card-panel {
    background: var(--theme-surface);
  }

  .fixture-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .inner-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
    margin-top: 0.65rem;
  }

  .nested-surface {
    background: var(--theme-surface-raised);
    color: var(--theme-text);
    border: 1px solid var(--theme-border);
  }

  .nested-muted {
    background: var(--theme-surface-muted);
  }

  .nested-subtle {
    background: var(--theme-surface-subtle);
  }

  .nested-field {
    background: var(--theme-field);
  }

  .fixture-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .fixture-panel,
  .inventory {
    padding: 1rem;
    background: var(--theme-surface);
    border: 1px solid var(--theme-border);
  }

  .text-stack,
  .inventory-grid {
    display: grid;
    gap: 0.7rem;
    margin-top: 0.9rem;
  }

  .text-sample {
    display: grid;
    gap: 0.2rem;
    text-align: left;
    background: transparent;
  }

  .text-sample-text {
    color: var(--theme-text);
  }

  .text-sample-text-secondary {
    color: var(--theme-text-secondary);
  }

  .text-sample-text-muted {
    color: var(--theme-text-muted);
  }

  .text-sample-text-faint {
    color: var(--theme-text-faint);
  }

  .text-sample-text-inverse {
    color: var(--theme-text-inverse);
    background: var(--theme-accent-strong);
  }

  .accent-grid,
  .status-grid,
  .control-grid,
  .border-grid {
    margin-top: 0.9rem;
  }

  .accent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .accent-sample {
    min-height: 4.2rem;
    text-align: left;
    font-weight: 700;
  }

  .accent-sample-accent {
    background: var(--theme-accent);
    color: var(--theme-text-inverse);
  }

  .accent-sample-accent-strong {
    background: var(--theme-accent-strong);
    color: var(--theme-text-inverse);
  }

  .accent-sample-accent-surface {
    background: var(--theme-accent-surface);
    color: var(--theme-text);
  }

  .accent-sample-link {
    background: transparent;
    color: var(--theme-link);
    border-color: var(--theme-link);
  }

  .accent-sample-link-hover {
    background: transparent;
    color: var(--theme-link-hover);
    border-color: var(--theme-link-hover);
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-card {
    display: grid;
    gap: 0.25rem;
    min-height: 4.5rem;
    text-align: left;
  }

  .status-card-success {
    background: var(--theme-success-surface);
    color: var(--theme-success);
  }

  .status-card-warning {
    background: var(--theme-warning-surface);
    color: var(--theme-warning);
  }

  .status-card-danger {
    background: var(--theme-danger-surface);
    color: var(--theme-danger);
  }

  .status-card-info {
    background: var(--theme-info-surface);
    color: var(--theme-info);
  }

  .control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .control-primary {
    background: var(--theme-control-primary);
    color: var(--theme-control-primary-text);
  }

  .control-secondary {
    background: var(--theme-control-secondary);
    color: var(--theme-control-secondary-text);
    border-color: var(--theme-control-secondary-border);
  }

  .control-ghost {
    background: var(--theme-control-ghost-hover);
    color: var(--theme-text);
  }

  .input-preview {
    display: grid;
    gap: 0.45rem;
    padding: 0.8rem;
    border-radius: 1rem;
    border: 1px solid var(--theme-input-border);
    background: var(--theme-input);
    color: var(--theme-text);
  }

  .input-preview input {
    background: var(--theme-input);
    border-color: var(--theme-input-border);
    color: var(--theme-text);
  }

  .input-preview input::placeholder {
    color: var(--theme-input-placeholder);
  }

  .border-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .border-sample {
    min-height: 4rem;
    text-align: left;
    background: var(--theme-surface-raised);
    color: var(--theme-text);
  }

  .border-sample-border {
    border-color: var(--theme-border);
  }

  .border-sample-border-subtle {
    border-color: var(--theme-border-subtle);
  }

  .border-sample-border-strong {
    border-color: var(--theme-border-strong);
  }

  .border-sample-focus-ring {
    border-color: var(--theme-focus-ring);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--theme-focus-ring) 25%, transparent);
  }

  .fixture-panel-overlay {
    grid-column: 1 / -1;
  }

  .overlay-demo {
    position: relative;
    margin-top: 0.9rem;
    min-height: 11rem;
    border-radius: 1rem;
    overflow: hidden;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 35%, var(--theme-surface-subtle)), var(--theme-surface-muted));
  }

  .scrim {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, black 35%, transparent);
  }

  .overlay-card {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    width: min(22rem, calc(100% - 2.5rem));
    padding: 1rem;
    background: var(--theme-surface-overlay);
    color: var(--theme-text);
    border: 1px solid var(--theme-border);
  }

  .inventory {
    margin-top: 1rem;
  }

  .inventory-group + .inventory-group {
    margin-top: 1rem;
  }

  .inventory-group-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .inventory-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .inventory-card {
    display: grid;
    gap: 0.45rem;
    text-align: left;
    background: rgba(255, 255, 255, 0.04);
    color: var(--theme-text);
    border-color: var(--theme-border);
  }

  .inventory-swatch {
    height: 2.5rem;
    border-radius: 0.8rem;
    border: 1px solid color-mix(in srgb, var(--theme-text) 12%, transparent);
  }

  .inventory-title {
    font-weight: 700;
  }

  .inventory-card code {
    color: var(--theme-text-muted);
  }

  .selected-usage {
    border-color: color-mix(in srgb, var(--theme-accent-strong) 60%, white);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent-strong) 18%, transparent);
  }

  .warning {
    position: relative;
  }

  .warning::after {
    content: '!';
    position: absolute;
    top: 0.55rem;
    right: 0.55rem;
    display: grid;
    place-items: center;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--theme-danger) 20%, white);
    color: var(--theme-danger);
    font-weight: 800;
  }

  @media (max-width: 1100px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .hero-grid,
    .fixture-grid,
    .inventory-grid,
    .field-grid,
    .channel-grid,
    .swatch-row,
    .control-grid,
    .border-grid,
    .status-grid,
    .accent-grid,
    .alias-row,
    .review-card {
      grid-template-columns: 1fr;
    }
  }
</style>
