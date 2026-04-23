import { describe, expect, it } from 'vitest';

import {
  parseInPageDrawerFromFrameMessage,
  parseInPageDrawerToFrameMessage,
  toInPageDrawerEnvelope
} from './inpage-drawer-messaging';

describe('in-page drawer messaging', () => {
  it('parses snapshot:update messages for the iframe', () => {
    const parsed = parseInPageDrawerToFrameMessage(
      toInPageDrawerEnvelope({
        kind: 'snapshot:update',
        snapshot: null,
        mode: 'dark',
        highlightedTokenId: 'surface',
        focusedTokenId: 'text'
      })
    );

    expect(parsed).toEqual({
      kind: 'snapshot:update',
      snapshot: null,
      mode: 'dark',
      highlightedTokenId: 'surface',
      focusedTokenId: 'text'
    });
  });

  it('rejects malformed iframe messages', () => {
    const parsed = parseInPageDrawerToFrameMessage({
      source: 'semantic-colors-inpage-drawer',
      payload: {
        kind: 'mode:update',
        mode: 'live'
      }
    });

    expect(parsed).toBeNull();
  });

  it('parses token focus requests from iframe', () => {
    const parsed = parseInPageDrawerFromFrameMessage(
      toInPageDrawerEnvelope({
        kind: 'token:focus',
        tokenId: 'surface-raised',
        source: 'preview'
      })
    );

    expect(parsed).toEqual({
      kind: 'token:focus',
      tokenId: 'surface-raised',
      source: 'preview'
    });
  });

  it('rejects token focus requests missing source', () => {
    const parsed = parseInPageDrawerFromFrameMessage({
      source: 'semantic-colors-inpage-drawer',
      payload: {
        kind: 'token:focus',
        tokenId: 'surface'
      }
    });

    expect(parsed).toBeNull();
  });
});
