<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Input } from '$lib/components/ui/input';
  import {
    getBoundedSteppedValue,
    getDraggedSliderValue,
    getPointerSliderValue,
    getSliderPercent
  } from '$lib/components/semantic-colors/number-slider';
  import { cn } from '$lib/utils';

  type SliderDragState = {
    lastClientX: number;
    trackLeft: number;
    trackWidth: number;
  };

  /** Boolean capture flag (must match for removeEventListener). */
  const useCapture = true;

  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    onChange,
    onPreviewChange,
    class: className,
    inputClass
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: () => void;
    onPreviewChange?: () => void;
    class?: string;
    inputClass?: string;
  } = $props();

  let sliderDragState = $state<SliderDragState | null>(null);
  /** Document that owns the listeners while dragging (panel iframe vs app). */
  let dragOwnerDocument: Document | null = null;
  /**
   * True while mouse-drag listeners are active. During this window, value updates must not
   * call `onChange` — the extension panel remounts TokenAuthoringEditor on every bridge
   * snapshot version bump, which tears down this component and kills mid-drag listeners.
   */
  let mouseDragSession = false;
  let deferredOnChangeAfterDrag = false;

  const clampedValue = $derived(Math.min(max, Math.max(min, value)));
  const sliderPercent = $derived(getSliderPercent(clampedValue, min, max));

  function commitValue(nextValue: number): void {
    if (nextValue === value) {
      return;
    }

    value = nextValue;
    onPreviewChange?.();
    if (mouseDragSession) {
      deferredOnChangeAfterDrag = true;
    } else {
      onChange();
    }
  }

  function handleNumberInput(): void {
    onChange();
  }

  function teardownDocumentDrag(): void {
    if (!dragOwnerDocument) {
      return;
    }
    dragOwnerDocument.removeEventListener('mousemove', handleDocumentMouseMove, useCapture);
    dragOwnerDocument.removeEventListener('mouseup', handleDocumentMouseUp, useCapture);
    dragOwnerDocument = null;
  }

  function applySliderDragMove(clientX: number, shiftKey: boolean): void {
    const drag = sliderDragState;
    if (!drag) {
      return;
    }

    const nextValue = shiftKey
      ? getDraggedSliderValue({
          value: clampedValue,
          deltaPixels: clientX - drag.lastClientX,
          trackWidth: drag.trackWidth,
          min,
          max,
          step,
          fineAdjustment: true
        })
      : getPointerSliderValue({
          clientX,
          trackLeft: drag.trackLeft,
          trackWidth: drag.trackWidth,
          min,
          max,
          step
        });

    drag.lastClientX = clientX;
    commitValue(nextValue);
  }

  function handleDocumentMouseMove(event: MouseEvent): void {
    if (!sliderDragState) {
      return;
    }
    event.preventDefault();
    applySliderDragMove(event.clientX, event.shiftKey);
  }

  function handleDocumentMouseUp(event: MouseEvent): void {
    if (!sliderDragState) {
      return;
    }
    event.preventDefault();
    teardownDocumentDrag();
    sliderDragState = null;
    mouseDragSession = false;
    if (deferredOnChangeAfterDrag) {
      deferredOnChangeAfterDrag = false;
      onChange();
    }
  }

  function beginSliderDrag(clientX: number, shiftKey: boolean, trackHost: HTMLDivElement): void {
    const { left, width } = trackHost.getBoundingClientRect();
    if (width <= 0) {
      return;
    }

    const doc = trackHost.ownerDocument;
    teardownDocumentDrag();

    dragOwnerDocument = doc;
    mouseDragSession = true;
    deferredOnChangeAfterDrag = false;
    sliderDragState = {
      lastClientX: clientX,
      trackLeft: left,
      trackWidth: width
    };

    doc.addEventListener('mousemove', handleDocumentMouseMove, useCapture);
    doc.addEventListener('mouseup', handleDocumentMouseUp, useCapture);

    const nextValue = shiftKey
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
          clientX,
          trackLeft: left,
          trackWidth: width,
          min,
          max,
          step
        });

    commitValue(nextValue);
  }

  /**
   * Mouse-only drag (document-level capture). Avoids `setPointerCapture`, which can throw
   * in Chrome DevTools extension panels and abort before listeners are attached.
   */
  function handleSliderMouseDown(
    event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();

    beginSliderDrag(event.clientX, event.shiftKey, event.currentTarget);
  }

  onDestroy(() => {
    teardownDocumentDrag();
    sliderDragState = null;
    mouseDragSession = false;
    if (deferredOnChangeAfterDrag) {
      deferredOnChangeAfterDrag = false;
      onChange();
    }
  });

  function handleSliderKeydown(event: KeyboardEvent): void {
    let nextValue: number;

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
  <span class="text-sm font-medium text-[color:var(--shell-color-text-secondary)]">{label}</span>
  <div
    aria-label={label}
    aria-orientation="horizontal"
    aria-valuemax={max}
    aria-valuemin={min}
    aria-valuenow={clampedValue}
    class="relative flex h-10 w-full touch-none items-center px-1 select-none"
    onkeydown={handleSliderKeydown}
    onmousedown={handleSliderMouseDown}
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
