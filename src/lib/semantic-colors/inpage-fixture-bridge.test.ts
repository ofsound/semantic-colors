import { describe, expect, it } from 'vitest';

import { createDefaultManifest } from '$lib/theme/defaults';
import { validateManifest } from '$lib/theme/engine';
import { TOKEN_GROUP_ORDER, TOKENS_BY_GROUP } from '$lib/theme/schema';

import type { BridgeSnapshot } from '$lib/server/bridge-state';

import { buildFixtureStagePropsFromBridge } from './inpage-fixture-bridge';

function minimalSnapshot(manifest: ReturnType<typeof createDefaultManifest>): BridgeSnapshot {
  const validations = validateManifest(manifest);
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    origin: 'ui',
    configPath: '/test/project.json',
    draft: { dirty: false, baseVersion: 0, lastEditor: 'ui' },
    manifest,
    resolved: {} as BridgeSnapshot['resolved'],
    css: '',
    tokenGroups: TOKEN_GROUP_ORDER,
    tokensByGroup: TOKENS_BY_GROUP,
    validations
  };
}

describe('buildFixtureStagePropsFromBridge', () => {
  it('uses manifest alt grayscale for fixture props (bridge parity)', () => {
    const manifest = createDefaultManifest();
    manifest.alt.grayscalePreview = true;
    const snapshot = minimalSnapshot(manifest);
    const props = buildFixtureStagePropsFromBridge(snapshot, 'light', 'surface');
    expect(props.grayscalePreview).toBe(true);
  });
});
