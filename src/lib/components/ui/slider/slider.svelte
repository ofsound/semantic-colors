<script lang="ts">
  import { Slider as SliderPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    value = $bindable(),
    orientation = 'horizontal',
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
  bind:ref
  bind:value={value as never}
  data-slot="slider"
  {orientation}
  class={cn(
    'relative flex w-full touch-none items-center px-1 select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
    className
  )}
  {...restProps}
>
  {#snippet children({ thumbItems })}
    <span
      data-slot="slider-track"
      data-orientation={orientation}
      class={cn(
        'relative grow overflow-hidden rounded-full bg-[color:var(--shell-slider-track,var(--muted))] data-horizontal:h-2 data-horizontal:w-full data-vertical:h-full data-vertical:w-2'
      )}
    >
      <SliderPrimitive.Range
        data-slot="slider-range"
        class={cn('bg-primary absolute select-none data-horizontal:h-full data-vertical:w-full')}
      />
    </span>
    {#each thumbItems as thumb (thumb.index)}
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        index={thumb.index}
        class="ring-ring/50 hover:border-primary focus-visible:border-primary block size-4 shrink-0 rounded-full border border-[color:var(--shell-field-border-strong,var(--border))] bg-[color:var(--shell-field-bg,var(--background))] shadow-[var(--shell-field-shadow,0_1px_2px_rgba(15,23,42,0.06))] transition-[color,box-shadow,border-color] select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
      />
    {/each}
  {/snippet}
</SliderPrimitive.Root>
