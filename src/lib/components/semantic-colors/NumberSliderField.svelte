<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Slider } from '$lib/components/ui/slider';
  import { cn } from '$lib/utils';

  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    onChange,
    class: className,
    inputClass
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: () => void;
    class?: string;
    inputClass?: string;
  } = $props();

  function handleNumberInput(): void {
    onChange();
  }
</script>

<div class={cn('grid grid-cols-[5rem_minmax(0,1fr)_5rem] items-center gap-3', className)}>
  <span class="text-sm font-medium text-slate-700">{label}</span>
  <Slider
    bind:value
    {max}
    {min}
    {step}
    onValueChange={(nextValue) => {
      value = nextValue;
      onChange();
    }}
    type="single"
  />
  <Input
    bind:value
    type="number"
    class={cn('h-9 min-w-0 px-2 text-sm', inputClass)}
    {max}
    {min}
    {step}
    oninput={handleNumberInput}
  />
</div>
