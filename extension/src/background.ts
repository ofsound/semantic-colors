import { panelPortName } from './shared/messaging';
import type { ContentMessageEnvelope, PanelMessageEnvelope } from './shared/messaging';
import type { PanelToContentMessage } from './shared/types';

const panelPorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith('panel:')) return;
  const tabId = Number(port.name.slice('panel:'.length));
  if (!Number.isFinite(tabId)) return;

  panelPorts.set(tabId, port);

  port.onMessage.addListener((message) => {
    const envelope = message as PanelMessageEnvelope;
    if (envelope?.source !== 'panel') return;
    const targetTabId = envelope.tabId ?? tabId;
    try {
      chrome.tabs.sendMessage(targetTabId, envelope.payload satisfies PanelToContentMessage);
    } catch {
      // Tab might have navigated away or be restricted.
    }
  });

  port.onDisconnect.addListener(() => {
    if (panelPorts.get(tabId) === port) {
      panelPorts.delete(tabId);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  const envelope = message as ContentMessageEnvelope;
  if (envelope?.source !== 'content') return;
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  const port = panelPorts.get(tabId);
  if (!port) return;
  try {
    port.postMessage(envelope);
  } catch {
    panelPorts.delete(tabId);
  }
});

// Export nothing; IIFE bundle expects top-level registrations only.
void panelPortName;
