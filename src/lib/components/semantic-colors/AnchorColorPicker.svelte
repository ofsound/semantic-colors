<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    hsvToRgb,
    parseColor,
    pickerPointToHsv,
    pickerPositionFromHsv,
    rgbToHex,
    rgbToHsv,
    toCssColor,
    toRgbColor
  } from '$lib/theme/color';
  import type { OklchColor } from '$lib/theme/schema';

  const SV_PANEL_BACKGROUND =
    'linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0) 50%), linear-gradient(to bottom, rgba(255, 255, 255, 0) 50%, #fff 100%), linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)';

  let {
    color = $bindable(),
    label,
    onPersistChange,
    onPreviewChange
  }: {
    color: OklchColor;
    label: string;
    onPersistChange: () => void;
    onPreviewChange?: () => void;
  } = $props();

  const useCapture = true;

  let panelBounds: DOMRect | null = null;
  let dragOwnerDocument: Document | null = null;
  /** True between mousedown on the panel and mouseup (document-level drag). */
  let mouseDragSession = false;
  let deferredPersistAfterDrag = false;

  const swatchBackground = $derived(toCssColor(color));
  const currentRgb = $derived(toRgbColor(color));
  const currentHsv = $derived(rgbToHsv(currentRgb));
  const pointerPosition = $derived(pickerPositionFromHsv(currentHsv));

  function applyColor(nextColor: OklchColor, persist: boolean): void {
    color.l = nextColor.l;
    color.c = nextColor.c;
    color.h = nextColor.h;
    color.alpha = nextColor.alpha ?? 1;
    onPreviewChange?.();
    if (persist) {
      deferredPersistAfterDrag = false;
      onPersistChange();
    } else {
      deferredPersistAfterDrag = true;
    }
  }

  function applyHsv(hue: number, saturation: number, value: number, persist: boolean): void {
    const nextColor = parseColor(rgbToHex(hsvToRgb({ h: hue, s: saturation, v: value })));
    if (nextColor) {
      applyColor(nextColor, persist);
    }
  }

  function teardownDocumentDrag(): void {
    if (!dragOwnerDocument) {
      return;
    }
    dragOwnerDocument.removeEventListener('mousemove', handleDocumentMouseMove, useCapture);
    dragOwnerDocument.removeEventListener('mouseup', handleDocumentMouseUp, useCapture);
    dragOwnerDocument = null;
  }

  function handleDocumentMouseMove(event: MouseEvent): void {
    if (!mouseDragSession || !panelBounds) {
      return;
    }
    event.preventDefault();
    const nextHsv = pickerPointToHsv(
      panelBounds.width,
      panelBounds.height,
      event.clientX - panelBounds.left,
      event.clientY - panelBounds.top
    );
    applyHsv(nextHsv.h, nextHsv.s, nextHsv.v, false);
  }

  function handleDocumentMouseUp(event: MouseEvent): void {
    if (!mouseDragSession) {
      return;
    }
    event.preventDefault();
    teardownDocumentDrag();
    mouseDragSession = false;
    panelBounds = null;
    if (deferredPersistAfterDrag) {
      deferredPersistAfterDrag = false;
      onPersistChange();
    }
  }

  function handlePanelMouseDown(
    event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.focus();

    panelBounds = event.currentTarget.getBoundingClientRect();
    const nextHsv = pickerPointToHsv(
      panelBounds.width,
      panelBounds.height,
      event.clientX - panelBounds.left,
      event.clientY - panelBounds.top
    );

    mouseDragSession = true;
    deferredPersistAfterDrag = false;
    applyHsv(nextHsv.h, nextHsv.s, nextHsv.v, false);

    const doc = event.currentTarget.ownerDocument;
    teardownDocumentDrag();
    dragOwnerDocument = doc;
    doc.addEventListener('mousemove', handleDocumentMouseMove, useCapture);
    doc.addEventListener('mouseup', handleDocumentMouseUp, useCapture);
  }

  onDestroy(() => {
    teardownDocumentDrag();
    mouseDragSession = false;
    panelBounds = null;
    if (deferredPersistAfterDrag) {
      deferredPersistAfterDrag = false;
      onPersistChange();
    }
  });

  function handlePanelKeydown(event: KeyboardEvent): void {
    const horizontalStep = 2;
    const verticalStep = 2;
    const { xPercent, yPercent } = pickerPositionFromHsv(currentHsv);
    let nextX = parseFloat(xPercent);
    let nextY = parseFloat(yPercent);

    if (event.key === 'ArrowLeft') {
      nextX -= horizontalStep;
    } else if (event.key === 'ArrowRight') {
      nextX += horizontalStep;
    } else if (event.key === 'ArrowUp') {
      nextY -= verticalStep;
    } else if (event.key === 'ArrowDown') {
      nextY += verticalStep;
    } else {
      return;
    }

    event.preventDefault();
    const nextHsv = pickerPointToHsv(100, 100, nextX, nextY);
    applyHsv(nextHsv.h, nextHsv.s, nextHsv.v, true);
  }
</script>

<div aria-label={`${label} color picker`} class="picker-shell">
  <div class="picker-main-row">
    <div
      aria-label={`${label} selected color preview`}
      class="picker-swatch"
      style={`background-color: ${swatchBackground};`}
    ></div>

    <div
      aria-label={`${label} hue and brightness`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(currentHsv.v)}
      aria-valuetext={`Hue: ${Math.round(currentHsv.h)}°, Saturation: ${Math.round(currentHsv.s)}%, Value: ${Math.round(currentHsv.v)}%`}
      class="picker-panel"
      onkeydown={handlePanelKeydown}
      onmousedown={handlePanelMouseDown}
      role="slider"
      style={`background: ${SV_PANEL_BACKGROUND};`}
      tabindex="0"
    >
      <div
        class="picker-handle"
        style={`left: ${pointerPosition.xPercent}; top: ${pointerPosition.yPercent};`}
      ></div>
    </div>
  </div>
</div>

<style>
  .picker-shell {
    min-width: 0;
    user-select: none;
  }

  .picker-main-row {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0.75rem;
    min-height: clamp(7.5rem, 24vw, 10rem);
  }

  .picker-swatch {
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    border-radius: var(--shell-radius-inner);
    border: 1px solid rgba(15, 23, 42, 0.12);
  }

  .picker-panel {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-radius: var(--shell-radius-inner);
    border: 1px solid rgba(15, 23, 42, 0.12);
    cursor: crosshair;
    touch-action: none;
  }

  .picker-handle {
    position: absolute;
    width: 1rem;
    height: 1rem;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    background: white;
    box-shadow:
      0 0 0 1px rgba(15, 23, 42, 0.18),
      0 2px 8px rgba(15, 23, 42, 0.18);
    pointer-events: none;
  }
</style>
