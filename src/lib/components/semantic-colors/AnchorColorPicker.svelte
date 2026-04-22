<script lang="ts">
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
    onPersistChange
  }: {
    color: OklchColor;
    label: string;
    onPersistChange: () => void;
  } = $props();

  let panelBounds: DOMRect | null = null;
  let dragMode: 'xy' | null = null;

  const swatchBackground = $derived(toCssColor(color));
  const currentRgb = $derived(toRgbColor(color));
  const currentHsv = $derived(rgbToHsv(currentRgb));
  const pointerPosition = $derived(pickerPositionFromHsv(currentHsv));

  function applyColor(nextColor: OklchColor): void {
    color.l = nextColor.l;
    color.c = nextColor.c;
    color.h = nextColor.h;
    color.alpha = nextColor.alpha ?? 1;
    onPersistChange();
  }

  function applyHsv(hue: number, saturation: number, value: number): void {
    const nextColor = parseColor(rgbToHex(hsvToRgb({ h: hue, s: saturation, v: value })));
    if (nextColor) {
      applyColor(nextColor);
    }
  }

  function handleWindowPointerMove(event: PointerEvent): void {
    if (dragMode !== 'xy' || !panelBounds) {
      return;
    }

    const nextHsv = pickerPointToHsv(
      panelBounds.width,
      panelBounds.height,
      event.clientX - panelBounds.left,
      event.clientY - panelBounds.top
    );
    applyHsv(nextHsv.h, nextHsv.s, nextHsv.v);
  }

  function handleWindowPointerUp(): void {
    dragMode = null;
    panelBounds = null;
  }

  function handlePointerDown(
    event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
  ): void {
    panelBounds = event.currentTarget.getBoundingClientRect();
    const nextHsv = pickerPointToHsv(
      panelBounds.width,
      panelBounds.height,
      event.clientX - panelBounds.left,
      event.clientY - panelBounds.top
    );
    applyHsv(nextHsv.h, nextHsv.s, nextHsv.v);
    dragMode = 'xy';
  }

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
    applyHsv(nextHsv.h, nextHsv.s, nextHsv.v);
  }
</script>

<svelte:window onpointermove={handleWindowPointerMove} onpointerup={handleWindowPointerUp} />

<div aria-label={`${label} color picker`} class="picker-shell">
  <div class="picker-stack">
    <div class="picker-swatch-row">
      <div
        aria-label={`${label} selected color preview`}
        class="picker-swatch"
        style={`background-color: ${swatchBackground};`}
      ></div>
    </div>

    <div
      aria-label={`${label} hue and brightness`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(currentHsv.v)}
      aria-valuetext={`Hue: ${Math.round(currentHsv.h)}°, Saturation: ${Math.round(currentHsv.s)}%, Value: ${Math.round(currentHsv.v)}%`}
      class="picker-panel"
      onkeydown={handlePanelKeydown}
      onpointerdown={handlePointerDown}
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

  .picker-stack {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.75rem;
  }

  .picker-swatch-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .picker-swatch {
    width: 100%;
    min-height: 4.5rem;
    border-radius: var(--shell-radius-inner);
    border: 1px solid rgba(15, 23, 42, 0.12);
  }

  .picker-panel {
    position: relative;
    height: clamp(7rem, 23vw, 9.375rem);
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

  @media (min-width: 640px) {
    .picker-stack {
      flex-direction: column;
    }

    .picker-swatch-row {
      flex-direction: row;
      align-items: stretch;
    }

    .picker-swatch {
      flex: 1 1 auto;
      min-height: 4.5rem;
    }
  }
</style>
