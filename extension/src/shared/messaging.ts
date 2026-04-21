import type { ContentToPanelMessage, PanelToContentMessage } from './types';

/**
 * The background service worker acts as a relay:
 *   panel  <—port—>  background  <—runtime message—>  content script
 *
 * The panel opens a long-lived port named `panel:<tabId>`; the SW stores it.
 * Content scripts use chrome.runtime.sendMessage; the SW looks up the port
 * for the sender tab and forwards.
 */

export function panelPortName(tabId: number): string {
  return `panel:${tabId}`;
}

export interface PanelMessageEnvelope {
  source: 'panel';
  tabId: number;
  payload: PanelToContentMessage;
}

export interface ContentMessageEnvelope {
  source: 'content';
  payload: ContentToPanelMessage;
}

export type RelayMessage = PanelMessageEnvelope | ContentMessageEnvelope;
