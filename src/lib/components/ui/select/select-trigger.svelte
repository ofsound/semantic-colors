<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';
  import { cn, type WithoutChild } from '$lib/utils.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = 'default',
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: 'sm' | 'default';
  } = $props();
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex w-fit items-center justify-between gap-1.5 rounded-md border border-[color:var(--shell-field-border,var(--input))] bg-[color:var(--shell-field-bg,var(--background))] py-2 pr-2 pl-2.5 text-sm whitespace-nowrap shadow-[var(--shell-field-shadow,0_1px_2px_rgba(15,23,42,0.06))] transition-[color,box-shadow,background-color,border-color] outline-none hover:bg-[color:var(--shell-field-bg-hover,var(--background))] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronDownIcon class="text-muted-foreground pointer-events-none size-4" />
</SelectPrimitive.Trigger>
