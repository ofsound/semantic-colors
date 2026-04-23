import type {
  BridgeSnapshot,
  InPageDrawerFromFrameMessage,
  InPageDrawerToFrameMessage,
  ThemeMode
} from './types';

export const INPAGE_DRAWER_MESSAGE_SOURCE = 'semantic-colors-inpage-drawer' as const;

interface InPageDrawerEnvelope<TPayload> {
  source: typeof INPAGE_DRAWER_MESSAGE_SOURCE;
  payload: TPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'alt';
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

function parseEnvelopePayload(data: unknown): unknown | null {
  if (!isRecord(data)) return null;
  if (data.source !== INPAGE_DRAWER_MESSAGE_SOURCE) return null;
  return data.payload;
}

export function toInPageDrawerEnvelope<
  TPayload extends InPageDrawerFromFrameMessage | InPageDrawerToFrameMessage
>(payload: TPayload): InPageDrawerEnvelope<TPayload> {
  return {
    source: INPAGE_DRAWER_MESSAGE_SOURCE,
    payload
  };
}

export function parseInPageDrawerToFrameMessage(data: unknown): InPageDrawerToFrameMessage | null {
  const payload = parseEnvelopePayload(data);
  if (!isRecord(payload) || typeof payload.kind !== 'string') {
    return null;
  }

  switch (payload.kind) {
    case 'snapshot:update':
      if (!isThemeMode(payload.mode)) return null;
      if (!isNullableString(payload.highlightedTokenId)) return null;
      if (!isNullableString(payload.focusedTokenId)) return null;
      if (payload.snapshot !== null && !isRecord(payload.snapshot)) return null;
      return {
        kind: 'snapshot:update',
        snapshot: payload.snapshot as BridgeSnapshot | null,
        mode: payload.mode,
        highlightedTokenId: payload.highlightedTokenId,
        focusedTokenId: payload.focusedTokenId
      };
    case 'mode:update':
      if (!isThemeMode(payload.mode)) return null;
      return {
        kind: 'mode:update',
        mode: payload.mode
      };
    case 'token:highlight':
      if (!isNullableString(payload.tokenId)) return null;
      return {
        kind: 'token:highlight',
        tokenId: payload.tokenId
      };
    case 'token:focus':
      if (!isNullableString(payload.tokenId)) return null;
      return {
        kind: 'token:focus',
        tokenId: payload.tokenId
      };
    default:
      return null;
  }
}

export function parseInPageDrawerFromFrameMessage(
  data: unknown
): InPageDrawerFromFrameMessage | null {
  const payload = parseEnvelopePayload(data);
  if (!isRecord(payload) || typeof payload.kind !== 'string') {
    return null;
  }

  switch (payload.kind) {
    case 'token:focus':
      if (typeof payload.tokenId !== 'string' || payload.tokenId.length === 0) return null;
      if (payload.source !== 'preview' && payload.source !== 'tokens') return null;
      return {
        kind: 'token:focus',
        tokenId: payload.tokenId,
        source: payload.source
      };
    case 'drawer:close':
      return { kind: 'drawer:close' };
    default:
      return null;
  }
}
