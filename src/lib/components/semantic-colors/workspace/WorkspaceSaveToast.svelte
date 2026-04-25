<script lang="ts">
  import type { SaveState } from '$lib/theme/workspace-controller.svelte';

  let {
    saveHeading,
    saveMessage,
    saveState,
    saveToastTone
  }: {
    saveHeading: string;
    saveMessage: string;
    saveState: SaveState;
    saveToastTone: string;
  } = $props();
</script>

{#if saveState !== 'idle'}
  <div
    aria-atomic="true"
    aria-live={saveState === 'error' ? 'assertive' : 'polite'}
    class={`save-toast ${saveToastTone}`}
    role={saveState === 'error' ? 'alert' : 'status'}
  >
    <strong>{saveHeading}</strong>
    <span>{saveMessage}</span>
  </div>
{/if}

<style>
  .save-toast {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 60;
    display: grid;
    gap: 0.15rem;
    min-width: min(20rem, calc(100vw - 2rem));
    max-width: min(24rem, calc(100vw - 2rem));
    padding: 0.85rem 1rem;
    border: 1px solid var(--shell-color-border-subtle);
    border-radius: 1rem;
    box-shadow: var(--shell-toast-shadow);
    backdrop-filter: blur(18px);
    pointer-events: none;
  }

  .save-toast strong {
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .save-toast span {
    font-size: 0.92rem;
    line-height: 1.35;
  }

  .save-toast-saving {
    background: var(--shell-color-info-surface);
    border-color: var(--shell-color-info-border);
    color: var(--shell-color-info);
  }

  .save-toast-saved {
    background: var(--shell-color-success-surface);
    border-color: var(--shell-color-success-border);
    color: var(--shell-color-success);
  }

  .save-toast-error {
    background: var(--shell-color-danger-surface);
    border-color: var(--shell-color-danger-border);
    color: var(--shell-color-danger);
  }

  @media (max-width: 640px) {
    .save-toast {
      left: 0.75rem;
      right: 0.75rem;
      top: 0.75rem;
      min-width: auto;
      max-width: none;
    }
  }
</style>
