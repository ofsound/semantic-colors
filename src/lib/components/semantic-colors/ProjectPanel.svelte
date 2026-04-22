<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { Input } from '$lib/components/ui/input';
  import type { ProjectConfig } from '$lib/theme/schema';

  let {
    config = $bindable(),
    configPath = $bindable(),
    onPersistChange,
    saveState,
    saveHeading,
    saveMessage,
    saveHint,
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
    onReload: () => void | Promise<void>;
    onRetrySave: () => void | Promise<void>;
  } = $props();

  function saveStateClass(state: typeof saveState): string {
    if (state === 'saving') {
      return 'bg-sky-500/8';
    }

    if (state === 'saved') {
      return 'bg-emerald-500/10';
    }

    if (state === 'error') {
      return 'border border-red-500/20 bg-red-500/12';
    }

    return 'bg-slate-900/4';
  }

  function savePillClass(state: typeof saveState): string {
    if (state === 'saving') {
      return 'bg-sky-500/12 text-sky-700';
    }

    if (state === 'saved') {
      return 'bg-emerald-500/14 text-emerald-700';
    }

    if (state === 'error') {
      return 'bg-red-500/14 text-red-700';
    }

    return 'bg-slate-900/8 text-slate-700';
  }
</script>

<Card.Root
  class="gap-4 border-0 ring-0 shadow-none bg-[color:var(--shell-panel-bg)] py-4 backdrop-blur-md"
>
  <Card.Header class="gap-3 px-4">
    <div class="flex justify-end">
      <Button onclick={onReload} size="sm" variant="outline">Reload</Button>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4 px-4">
    <label class="grid gap-2 text-sm font-medium text-slate-700">
      <span>Project config path</span>
      <Input bind:value={configPath} oninput={onPersistChange} />
    </label>

    <label class="grid gap-2 text-sm font-medium text-slate-700">
      <span>Project root</span>
      <Input
        bind:value={config.projectRoot}
        oninput={onPersistChange}
        placeholder="/absolute/path/to/project"
      />
    </label>

    <div class="grid gap-4 md:grid-cols-2">
      <label class="grid gap-2 text-sm font-medium text-slate-700">
        <span>Manifest path</span>
        <Input bind:value={config.manifestPath} oninput={onPersistChange} />
      </label>
      <label class="grid gap-2 text-sm font-medium text-slate-700">
        <span>CSS output path</span>
        <Input bind:value={config.cssOutputPath} oninput={onPersistChange} />
      </label>
    </div>

    <label class="flex items-start gap-3 rounded-lg bg-slate-900/4 px-3 py-3 text-left">
      <Checkbox bind:checked={config.bridgeEnabled} onchange={onPersistChange} />
      <span class="grid gap-1">
        <span class="text-sm font-medium text-slate-900"
          >Write generated CSS into the target project</span
        >
      </span>
    </label>

    <div
      aria-live={saveState === 'error' ? 'assertive' : 'polite'}
      class={`grid gap-3 rounded-xl p-4 ${saveStateClass(saveState)}`}
      role={saveState === 'error' ? 'alert' : 'status'}
    >
      <div class="flex items-center justify-between gap-3">
        <strong class="text-sm font-semibold text-slate-900">{saveHeading}</strong>
        <span
          class={`rounded-full px-2.5 py-1 text-[0.72rem] font-bold tracking-[0.08em] uppercase ${savePillClass(saveState)}`}
        >
          {saveState}
        </span>
      </div>
      <p class="text-sm font-semibold text-slate-900">{saveMessage}</p>
      <p class="text-sm text-slate-600">{saveHint}</p>

      {#if saveState === 'error'}
        <div class="flex flex-wrap gap-2">
          <Button onclick={onRetrySave} variant="secondary">Retry save</Button>
          <Button onclick={onReload} variant="ghost">Reload project</Button>
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
