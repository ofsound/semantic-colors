<script lang="ts">
  import AnchorColorPicker from '$lib/components/semantic-colors/AnchorColorPicker.svelte';
  import NumberSliderField from '$lib/components/semantic-colors/NumberSliderField.svelte';
  import TailwindSwatchPicker from '$lib/components/semantic-colors/TailwindSwatchPicker.svelte';
  import type { OklchColor } from '$lib/theme/schema';

  let {
    color = $bindable(),
    label,
    onPersistChange,
    onPreviewChange,
    title
  }: {
    color: OklchColor;
    label: string;
    onPersistChange: () => void;
    onPreviewChange?: () => void;
    title: string;
  } = $props();
</script>

<section
  class="space-y-4 rounded-xl border border-[color:var(--shell-color-control-active-border)] bg-[color:var(--shell-color-control-active)] p-4"
>
  <div class="flex items-center justify-between gap-3">
    <strong class="text-sm font-semibold text-[color:var(--shell-color-text)]">{title}</strong>
  </div>
  <div class="flex flex-col gap-4">
    <AnchorColorPicker bind:color {label} {onPersistChange} {onPreviewChange} />
    <div class="flex min-w-0 flex-col gap-3">
      <NumberSliderField
        bind:value={color.l}
        class="w-full"
        label="Lightness"
        max={1}
        min={0}
        onChange={onPersistChange}
        {onPreviewChange}
        step={0.005}
      />
      <NumberSliderField
        bind:value={color.c}
        class="w-full"
        label="Chroma"
        max={0.37}
        min={0}
        onChange={onPersistChange}
        {onPreviewChange}
        step={0.005}
      />
      <NumberSliderField
        bind:value={color.h}
        class="w-full"
        label="Hue"
        max={360}
        min={0}
        onChange={onPersistChange}
        {onPreviewChange}
        step={1}
      />
    </div>
    <TailwindSwatchPicker bind:color {label} {onPersistChange} />
  </div>
</section>
