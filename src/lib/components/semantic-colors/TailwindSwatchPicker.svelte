<script lang="ts">
  import colors from 'tailwindcss/colors';

  import { parseColor, toHexColor } from '$lib/theme/color';
  import type { OklchColor } from '$lib/theme/schema';

  const SHADE_STEPS = [
    '950',
    '900',
    '800',
    '700',
    '600',
    '500',
    '400',
    '300',
    '200',
    '100',
    '50'
  ] as const;
  const PALETTE_FAMILIES = [
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
    'stone',
    'neutral',
    'zinc',
    'gray',
    'slate'
  ] as const;

  type ShadeStep = (typeof SHADE_STEPS)[number];
  type PaletteFamily = (typeof PALETTE_FAMILIES)[number];
  type Swatch = {
    family: PaletteFamily;
    shade: ShadeStep;
    hex: string;
  };

  const paletteRows: Array<{ family: PaletteFamily; swatches: Swatch[] }> = PALETTE_FAMILIES.map(
    (family) => ({
      family,
      swatches: SHADE_STEPS.map((shade) => ({
        family,
        shade,
        hex: colors[family][shade]
      }))
    })
  );

  let {
    color = $bindable(),
    label,
    onPersistChange
  }: {
    color: OklchColor;
    label: string;
    onPersistChange: () => void;
  } = $props();

  const currentHex = $derived(toHexColor(color));

  function applySwatch(hex: string): void {
    const nextColor = parseColor(hex);
    if (!nextColor) {
      return;
    }

    color.l = nextColor.l;
    color.c = nextColor.c;
    color.h = nextColor.h;
    color.alpha = nextColor.alpha ?? 1;
    onPersistChange();
  }

  function formatFamilyLabel(family: PaletteFamily): string {
    return family.charAt(0).toUpperCase() + family.slice(1);
  }
</script>

<div class="palette-shell" aria-label={`${label} Tailwind swatch picker`}>
  <div class="palette-header">
    <div>
      <p class="palette-eyebrow">Tailwind swatches</p>
      <p class="palette-note">Quick-pick a preset, then fine-tune with the sliders above.</p>
    </div>
    <code class="palette-current">{currentHex}</code>
  </div>

  <div class="palette-scroll">
    <div class="palette-grid-header" aria-hidden="true">
      <span></span>
      <div class="shade-grid">
        {#each SHADE_STEPS as shade (shade)}
          <span class="shade-label">{shade}</span>
        {/each}
      </div>
    </div>

    {#each paletteRows as row (row.family)}
      <div class="palette-row">
        <span class="family-label">{formatFamilyLabel(row.family)}</span>
        <div class="shade-grid">
          {#each row.swatches as swatch (swatch.family + swatch.shade)}
            <button
              type="button"
              aria-label={`${label} ${formatFamilyLabel(swatch.family)} ${swatch.shade}: ${swatch.hex}`}
              aria-pressed={currentHex === swatch.hex}
              class={['swatch-button', currentHex === swatch.hex && 'swatch-button-selected']}
              onclick={() => applySwatch(swatch.hex)}
              style={`background-color: ${swatch.hex};`}
              title={`${formatFamilyLabel(swatch.family)} ${swatch.shade} · ${swatch.hex}`}
            ></button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .palette-shell {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  .palette-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .palette-eyebrow {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgb(71 85 105);
  }

  .palette-note {
    margin: 0.2rem 0 0;
    font-size: 0.84rem;
    line-height: 1.4;
    color: rgb(100 116 139);
  }

  .palette-current {
    margin: 0;
    border-radius: 999px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.82);
    padding: 0.28rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: rgb(15 23 42);
  }

  .palette-scroll {
    display: grid;
    gap: 0.45rem;
    overflow-x: auto;
    padding-bottom: 0.15rem;
  }

  .palette-grid-header,
  .palette-row {
    display: grid;
    grid-template-columns: minmax(4.75rem, auto) minmax(18.5rem, 1fr);
    align-items: center;
    gap: 0.75rem;
    min-width: 24rem;
  }

  .family-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgb(51 65 85);
  }

  .shade-grid {
    display: grid;
    grid-template-columns: repeat(11, minmax(1.45rem, 1fr));
    gap: 0.35rem;
  }

  .shade-label {
    font-size: 0.67rem;
    font-weight: 700;
    text-align: center;
    color: rgb(100 116 139);
  }

  .swatch-button {
    aspect-ratio: 1;
    width: 100%;
    border-radius: 0.55rem;
    border: 1px solid rgba(15, 23, 42, 0.12);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.22),
      0 1px 2px rgba(15, 23, 42, 0.08);
    transition:
      transform 120ms ease,
      box-shadow 120ms ease,
      border-color 120ms ease;
  }

  .swatch-button:hover {
    transform: translateY(-1px);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.28),
      0 3px 10px rgba(15, 23, 42, 0.12);
  }

  .swatch-button:focus-visible {
    outline: 2px solid rgba(14, 165, 233, 0.5);
    outline-offset: 2px;
  }

  .swatch-button-selected {
    border-color: rgba(15, 23, 42, 0.4);
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.96),
      0 0 0 4px rgba(15, 23, 42, 0.88),
      inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  }
</style>
