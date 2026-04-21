<script lang="ts">
  let { visible, summary }: { visible: boolean; summary: string } = $props();
</script>

{#if visible}
  <span aria-label={summary} class="warning-badge" title={summary}>Warn</span>
{/if}
