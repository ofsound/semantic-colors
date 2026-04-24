import { panelPortName } from './shared/messaging';
import type { ContentMessageEnvelope, PanelMessageEnvelope } from './shared/messaging';
import type { ContentToPanelMessage, PanelToContentMessage } from './shared/types';

const panelPorts = new Map<number, chrome.runtime.Port>();

function postRelayError(port: chrome.runtime.Port, message: string): void {
  const envelope: ContentMessageEnvelope = {
    source: 'content',
    payload: { kind: 'error', message }
  };
  try {
    port.postMessage(envelope);
  } catch {
    // Ignore disconnect races.
  }
}

function relayToTab(
  tabId: number,
  payload: PanelToContentMessage,
  port: chrome.runtime.Port,
  attemptedInjection = false
): void {
  chrome.tabs.sendMessage(tabId, payload, () => {
    const lastError = chrome.runtime.lastError?.message;
    if (!lastError) return;

    const missingReceiver =
      lastError.includes('Could not establish connection') ||
      lastError.includes('Receiving end does not exist');

    if (!attemptedInjection && missingReceiver) {
      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ['content-bridge.js']
        },
        () => {
          if (chrome.runtime.lastError) {
            postRelayError(
              port,
              `Failed to attach content bridge: ${chrome.runtime.lastError.message}`
            );
            return;
          }
          relayToTab(tabId, payload, port, true);
        }
      );
      return;
    }

    postRelayError(port, `Unable to reach inspected page: ${lastError}`);
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (!port.name.startsWith('panel:')) return;
  const tabId = Number(port.name.slice('panel:'.length));
  if (!Number.isFinite(tabId)) return;

  panelPorts.set(tabId, port);

  port.onMessage.addListener((message) => {
    const envelope = message as PanelMessageEnvelope;
    if (envelope?.source !== 'panel') return;
    const targetTabId = envelope.tabId ?? tabId;
    relayToTab(targetTabId, envelope.payload satisfies PanelToContentMessage, port);
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

function postAuthoringShortcutToPanel(tabId: number, payload: ContentToPanelMessage): void {
  const port = panelPorts.get(tabId);
  if (!port) return;
  const envelope: ContentMessageEnvelope = { source: 'content', payload };
  try {
    port.postMessage(envelope);
  } catch {
    panelPorts.delete(tabId);
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'authoring-toggle-preview') return;
  void chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined) return;
    postAuthoringShortcutToPanel(tabId, {
      kind: 'authoring-shortcut',
      phase: 'down',
      key: 'p',
      repeat: false
    });
  });
});

// Export nothing; IIFE bundle expects top-level registrations only.
void panelPortName;
