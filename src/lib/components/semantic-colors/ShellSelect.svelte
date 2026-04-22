<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui';

  import * as Select from '$lib/components/ui/select';
  import { cn } from '$lib/utils';

  type SelectOption = {
    value: string;
    label: string;
  };

  let {
    value = $bindable(),
    options,
    placeholder,
    triggerClass,
    contentClass,
    disabled = false,
    onChange = () => {}
  }: {
    value: string;
    options: SelectOption[];
    placeholder: string;
    triggerClass?: string;
    contentClass?: string;
    disabled?: boolean;
    onChange?: (value: string) => void;
  } = $props();
</script>

<Select.Root bind:value {disabled} onValueChange={onChange} type="single">
  <Select.Trigger class={cn('w-full justify-between', triggerClass)}>
    <SelectPrimitive.Value {placeholder} />
  </Select.Trigger>
  <Select.Content class={contentClass}>
    {#each options as option (option.value)}
      <Select.Item value={option.value} label={option.label} />
    {/each}
  </Select.Content>
</Select.Root>
