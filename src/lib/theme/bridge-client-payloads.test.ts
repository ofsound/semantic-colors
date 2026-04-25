import { describe, expect, it } from 'vitest';

import {
  parseBridgeSseSnapshotEvent,
  parseBridgeSnapshotResponse
} from '$lib/theme/bridge-client-payloads';
import { createDefaultManifest } from '$lib/theme/defaults';

describe('parseBridgeSseSnapshotEvent', () => {
  it('returns null for invalid shapes', () => {
    expect(parseBridgeSseSnapshotEvent(null)).toBeNull();
    expect(parseBridgeSseSnapshotEvent({ type: 'ping' })).toBeNull();
    expect(parseBridgeSseSnapshotEvent({ type: 'snapshot' })).toBeNull();
  });

  it('accepts a minimal valid snapshot event', () => {
    const manifest = createDefaultManifest();
    const raw = {
      type: 'snapshot' as const,
      snapshot: {
        configPath: '/tmp/semantic-colors.project.json',
        origin: 'extension' as const,
        manifest,
        draft: { dirty: true, baseVersion: 1, lastEditor: 'extension' as const }
      }
    };
    const parsed = parseBridgeSseSnapshotEvent(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.configPath).toBe(raw.snapshot.configPath);
    expect(parsed?.manifest.name).toBe(manifest.name);
  });
});

describe('parseBridgeSnapshotResponse', () => {
  it('returns null when manifest is malformed', () => {
    const raw = {
      configPath: '/x/y.json',
      origin: 'server',
      manifest: { version: 1, incomplete: true }
    };
    expect(parseBridgeSnapshotResponse(raw)).toBeNull();
  });

  it('parses a full GET snapshot body', () => {
    const manifest = createDefaultManifest();
    const raw = {
      configPath: '/proj/semantic-colors.project.json',
      origin: 'ui' as const,
      manifest,
      draft: { dirty: false, baseVersion: 0, lastEditor: 'ui' as const },
      extraField: true
    };
    const parsed = parseBridgeSnapshotResponse(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.manifest.tokens.surface).toBeDefined();
  });
});
