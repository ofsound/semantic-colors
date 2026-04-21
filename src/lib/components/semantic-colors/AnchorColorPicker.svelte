<script lang="ts">
  import {
    hsvToRgb,
    parseColor,
    parseRgbInput,
    pickerPointToHsv,
    pickerPositionFromHsv,
    rgbToDisplayString,
    rgbToHex,
    rgbToHsv,
    toHexColor,
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
  let isEditingHex = $state(false);
  let isEditingRgb = $state(false);
  let hexDraft = $state('');
  let rgbDraft = $state('');
  let hexInvalid = $state(false);
  let rgbInvalid = $state(false);

  const currentHex = $derived(toHexColor(color));
  const currentRgb = $derived(toRgbColor(color));
  const currentRgbDisplay = $derived(rgbToDisplayString(currentRgb));
  const currentHsv = $derived(rgbToHsv(currentRgb));
  const pointerPosition = $derived(pickerPositionFromHsv(currentHsv));
  const displayedHex = $derived(isEditingHex ? hexDraft : currentHex);
  const displayedRgb = $derived(isEditingRgb ? rgbDraft : currentRgbDisplay);

  function normalizeHexInput(input: string): string | null {
    const trimmed = input.trim();
    const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    const isShortHex = /^[0-9a-fA-F]{3}$/.test(withoutHash);
    const isLongHex = /^[0-9a-fA-F]{6}$/.test(withoutHash);

    if (!isShortHex && !isLongHex) {
      return null;
    }

    const fullHex = isShortHex
      ? withoutHash
          .split('')
          .map((character) => character + character)
          .join('')
      : withoutHash;

    return `#${fullHex.toUpperCase()}`;
  }

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

  function beginHexEdit(): void {
    if (isEditingHex) {
      return;
    }

    isEditingHex = true;
    hexDraft = currentHex;
    hexInvalid = false;
  }

  function commitHexInput(): void {
    const normalized = normalizeHexInput(hexDraft);
    if (!normalized) {
      hexInvalid = true;
      return;
    }

    const nextColor = parseColor(normalized);
    if (!nextColor) {
      hexInvalid = true;
      return;
    }

    hexInvalid = false;
    isEditingHex = false;
    hexDraft = normalized;
    applyColor(nextColor);
  }

  function beginRgbEdit(): void {
    if (isEditingRgb) {
      return;
    }

    isEditingRgb = true;
    rgbDraft = currentRgbDisplay;
    rgbInvalid = false;
  }

  function commitRgbInput(): void {
    const parsed = parseRgbInput(rgbDraft);
    if (!parsed) {
      rgbInvalid = true;
      return;
    }

    const nextColor = parseColor(rgbToHex(parsed));
    if (!nextColor) {
      rgbInvalid = true;
      return;
    }

    rgbInvalid = false;
    isEditingRgb = false;
    rgbDraft = rgbToDisplayString(parsed);
    applyColor(nextColor);
  }
</script>

<svelte:window onpointermove={handleWindowPointerMove} onpointerup={handleWindowPointerUp} />

<div aria-label={`${label} color picker`} class="picker-shell">
  <div class="picker-stack">
    <div class="picker-input-row">
      <div class="picker-inputs">
        <input
          aria-label={`${label} hex color`}
          class={`picker-input ${hexInvalid ? 'picker-input-invalid' : ''}`}
          onblur={commitHexInput}
          onfocus={beginHexEdit}
          oninput={(event) => {
            isEditingHex = true;
            hexDraft = event.currentTarget.value.toUpperCase();
            if (hexInvalid) {
              hexInvalid = false;
            }
          }}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitHexInput();
            }
          }}
          spellcheck={false}
          type="text"
          value={displayedHex}
        />
        <input
          aria-label={`${label} rgb color`}
          class={`picker-input ${rgbInvalid ? 'picker-input-invalid' : ''}`}
          onblur={commitRgbInput}
          onfocus={beginRgbEdit}
          oninput={(event) => {
            isEditingRgb = true;
            rgbDraft = event.currentTarget.value;
            if (rgbInvalid) {
              rgbInvalid = false;
            }
          }}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitRgbInput();
            }
          }}
          spellcheck={false}
          type="text"
          value={displayedRgb}
        />
      </div>

      <div class="picker-swatch" style={`background-color: ${currentHex};`}></div>
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

  .picker-input-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .picker-inputs {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
  }

  .picker-input {
    width: 100%;
    min-width: 0;
    height: 2rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(15, 23, 42, 0.12);
    background: #f5f5f8;
    padding: 0 0.75rem;
    font-family:
      ui-monospace, 'SFMono-Regular', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .picker-input:focus-visible {
    outline: 2px solid rgba(59, 130, 246, 0.4);
    outline-offset: 1px;
  }

  .picker-input-invalid {
    border-color: rgba(220, 38, 38, 0.4);
    box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.25);
  }

  .picker-swatch {
    width: 100%;
    min-height: 4.5rem;
    border-radius: 0.9rem;
    border: 1px solid rgba(15, 23, 42, 0.12);
  }

  .picker-panel {
    position: relative;
    height: clamp(7rem, 23vw, 9.375rem);
    overflow: hidden;
    border-radius: 0.9rem;
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

    .picker-input-row {
      flex-direction: row;
      align-items: flex-start;
    }

    .picker-inputs {
      flex: 1 1 auto;
      min-width: 12ch;
    }

    .picker-swatch {
      flex: 0 0 6.75rem;
      min-height: 4.5rem;
    }
  }
</style>
