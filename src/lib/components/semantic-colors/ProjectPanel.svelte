<script lang="ts">
  import type { ProjectConfig } from '$lib/theme/schema';

  let {
    config = $bindable(),
    configPath = $bindable(),
    onPersistChange,
    saveState,
    saveHeading,
    saveMessage,
    saveHint,
    showSetupGuide,
    onReload,
    onRetrySave
  }: {
    config: ProjectConfig;
    configPath: string;
    onPersistChange: () => void;
    saveState: 'idle' | 'saving' | 'saved' | 'error';
    saveHeading: string;
    saveMessage: string;
    saveHint: string;
    showSetupGuide: boolean;
    onReload: () => void | Promise<void>;
    onRetrySave: () => void | Promise<void>;
  } = $props();
</script>

<section class="panel">
  <div class="panel-header">
    <div>
      <p class="eyebrow">Project bridge</p>
      <h1>Trimodal Semantic Engine</h1>
    </div>
    <button class="ghost-button" onclick={onReload} type="button">Reload</button>
  </div>

  <label class="field-block">
    <span>Project config path</span>
    <input bind:value={configPath} oninput={onPersistChange} />
  </label>

  <label class="field-block">
    <span>Project root</span>
    <input
      bind:value={config.projectRoot}
      oninput={onPersistChange}
      placeholder="/absolute/path/to/project"
    />
  </label>

  <div class="field-grid">
    <label class="field-block">
      <span>Manifest path</span>
      <input bind:value={config.manifestPath} oninput={onPersistChange} />
    </label>
    <label class="field-block">
      <span>CSS output path</span>
      <input bind:value={config.cssOutputPath} oninput={onPersistChange} />
    </label>
  </div>

  <label class="checkbox-row">
    <input bind:checked={config.bridgeEnabled} onchange={onPersistChange} type="checkbox" />
    <span>Write generated CSS into the target project</span>
  </label>

  <div
    aria-live={saveState === 'error' ? 'assertive' : 'polite'}
    class={`save-state save-state-${saveState}`}
    role={saveState === 'error' ? 'alert' : 'status'}
  >
    <div class="save-state-header">
      <strong>{saveHeading}</strong>
      <span class={`save-pill save-pill-${saveState}`}>{saveState}</span>
    </div>
    <p class="save-message">{saveMessage}</p>
    <p class="save-hint">{saveHint}</p>

    {#if saveState === 'error'}
      <div class="save-actions">
        <button class="secondary-button" onclick={onRetrySave} type="button">Retry save</button>
        <button class="ghost-button" onclick={onReload} type="button">Reload project</button>
      </div>
    {/if}
  </div>

  {#if showSetupGuide}
    <div class="setup-guide" role="note">
      <strong>First run checklist</strong>
      <ol>
        <li>Confirm the project root and output paths above.</li>
        <li>Add a source CSS path in the import panel.</li>
        <li>Scan variables or tune tokens directly in the editor.</li>
        <li>Enable bridge output only after the preview looks correct.</li>
      </ol>
    </div>
  {/if}
</section>

<style>
  .save-state {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.9rem;
    padding: 0.8rem;
    border-radius: var(--shell-radius-inner);
    background: rgba(15, 23, 42, 0.04);
  }

  .save-state-header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .save-state-saving {
    background: rgba(59, 130, 246, 0.08);
  }

  .save-state-saved {
    background: rgba(16, 185, 129, 0.09);
  }

  .save-state-error {
    border: 1px solid rgba(239, 68, 68, 0.2);
    background: rgba(239, 68, 68, 0.12);
  }

  .save-message,
  .save-hint {
    margin: 0;
  }

  .save-message {
    font-weight: 600;
  }

  .save-hint {
    color: #4b5563;
    font-size: 0.82rem;
  }

  .save-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .save-pill {
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .save-pill-idle {
    background: rgba(15, 23, 42, 0.08);
  }

  .save-pill-saving {
    background: rgba(59, 130, 246, 0.12);
    color: #1d4ed8;
  }

  .save-pill-saved {
    background: rgba(16, 185, 129, 0.14);
    color: #047857;
  }

  .save-pill-error {
    background: rgba(239, 68, 68, 0.14);
    color: #b91c1c;
  }

  .setup-guide {
    margin-top: 0.9rem;
    padding: 0.85rem;
    border-radius: var(--shell-radius-inner);
    background: rgba(15, 23, 42, 0.04);
  }

  .setup-guide strong {
    display: block;
    margin-bottom: 0.4rem;
  }

  .setup-guide ol {
    margin: 0;
    padding-left: 1.1rem;
    color: #4b5563;
  }

  .setup-guide li + li {
    margin-top: 0.3rem;
  }
</style>
