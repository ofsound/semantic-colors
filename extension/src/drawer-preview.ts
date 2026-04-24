import { mount } from 'svelte';
import DrawerPreviewApp from './DrawerPreviewApp.svelte';

const root = document.getElementById('drawer-svelte-host');
if (root) {
  mount(DrawerPreviewApp, { target: root });
} else {
  console.error('[semantic-colors] #drawer-svelte-host missing');
}
