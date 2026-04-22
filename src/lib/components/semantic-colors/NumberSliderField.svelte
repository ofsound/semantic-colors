<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import {
    getBoundedSteppedValue,
    getDraggedSliderValue,
    getPointerSliderValue,
    getSliderPercent
  } from '$lib/components/semantic-colors/number-slider';
  import { cn } from '$lib/utils';

  type SliderDragState = {
    pointerId: number;
    lastClientX: number;
    trackLeft: number;
    trackWidth: number;
  };

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

  let sliderDragState = $state<SliderDragState | null>(null);

  const clampedValue = $derived(Math.min(max, Math.max(min, value)));
  const sliderPercent = $derived(getSliderPercent(clampedValue, min, max));

  function commitValue(nextValue: number): void {
    if (nextValue === value) {
      return;
    }

    value = nextValue;
    onChange();
  }

  function handleNumberInput(): void {
    onChange();
  }

  function stopSliderDrag(
    event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): void {
    if (!sliderDragState || sliderDragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    sliderDragState = null;
  }

  function handleSliderPointerDown(
    event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): void {
    if (event.button !== 0) {
      return;
    }

    const { left, width } = event.currentTarget.getBoundingClientRect();
    if (width <= 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);

    sliderDragState = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      trackLeft: left,
      trackWidth: width
    };

    const nextValue = event.shiftKey
      ? getDraggedSliderValue({
          value: clampedValue,
          deltaPixels: 0,
          trackWidth: width,
          min,
          max,
          step,
          fineAdjustment: true
        })
      : getPointerSliderValue({
          clientX: event.clientX,
          trackLeft: left,
          trackWidth: width,
          min,
          max,
          step
        });

    commitValue(nextValue);
  }

  function handleSliderPointerMove(
    event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): void {
    if (!sliderDragState || sliderDragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const nextValue = event.shiftKey
      ? getDraggedSliderValue({
          value: clampedValue,
          deltaPixels: event.clientX - sliderDragState.lastClientX,
          trackWidth: sliderDragState.trackWidth,
          min,
          max,
          step,
          fineAdjustment: true
        })
      : getPointerSliderValue({
          clientX: event.clientX,
          trackLeft: sliderDragState.trackLeft,
          trackWidth: sliderDragState.trackWidth,
          min,
          max,
          step
        });

    sliderDragState.lastClientX = event.clientX;
    commitValue(nextValue);
  }

  function handleSliderKeydown(event: KeyboardEvent): void {
    let nextValue = clampedValue;

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nextValue = clampedValue - step;
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nextValue = clampedValue + step;
    } else if (event.key === 'PageDown') {
      nextValue = clampedValue - step * 10;
    } else if (event.key === 'PageUp') {
      nextValue = clampedValue + step * 10;
    } else if (event.key === 'Home') {
      nextValue = min;
    } else if (event.key === 'End') {
      nextValue = max;
    } else {
      return;
    }

    event.preventDefault();
    commitValue(getBoundedSteppedValue(nextValue, min, max, step));
  }
</script>

<div class={cn('grid grid-cols-[5rem_minmax(0,1fr)_5rem] items-center gap-3', className)}>
  <span class="text-sm font-medium text-slate-700">{label}</span>
  <div
    aria-label={label}
    aria-orientation="horizontal"
    aria-valuemax={max}
    aria-valuemin={min}
    aria-valuenow={clampedValue}
    class="relative flex h-10 w-full touch-none items-center px-1 select-none"
    onkeydown={handleSliderKeydown}
    onpointercancel={stopSliderDrag}
    onpointerdown={handleSliderPointerDown}
    onpointermove={handleSliderPointerMove}
    onpointerup={stopSliderDrag}
    role="slider"
    tabindex="0"
  >
    <span
      class="relative h-2 w-full overflow-hidden rounded-full bg-[color:var(--shell-slider-track,var(--muted))]"
    >
      <span class="bg-primary absolute inset-y-0 left-0" style={`width: ${sliderPercent}%;`}></span>
    </span>
    <span
      class="ring-ring/50 hover:border-primary focus-visible:border-primary absolute top-1/2 block size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:var(--shell-field-border-strong,var(--border))] bg-[color:var(--shell-field-bg,var(--background))] shadow-[var(--shell-field-shadow,0_1px_2px_rgba(15,23,42,0.06))] transition-[color,box-shadow,border-color] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden"
      style={`left: ${sliderPercent}%;`}
    ></span>
  </div>
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
