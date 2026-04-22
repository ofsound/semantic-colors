<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils.js';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>, HTMLElement> = $props();
</script>

<kbd
  bind:this={ref}
  data-slot="kbd"
  class={cn(
    'text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-black/10 bg-white/70 px-1.5 font-mono text-[0.72rem] leading-none font-semibold shadow-[0_1px_1px_rgba(15,23,42,0.08)]',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</kbd>
