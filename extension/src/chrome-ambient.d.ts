// Minimal ambient declarations for the Chrome Extension APIs we use.
// We deliberately type only the surfaces touched by this extension to avoid
// a heavy @types/chrome dependency at the root of the repo.

declare namespace chrome {
  namespace runtime {
    interface Port {
      name: string;
      sender?: { tab?: { id?: number } };
      onMessage: {
        addListener(listener: (message: unknown, port: Port) => void): void;
        removeListener(listener: (message: unknown, port: Port) => void): void;
      };
      onDisconnect: {
        addListener(listener: (port: Port) => void): void;
      };
      postMessage(message: unknown): void;
      disconnect(): void;
    }

    interface MessageSender {
      tab?: { id?: number };
      id?: string;
      url?: string;
      frameId?: number;
    }

    const id: string;
    const lastError: { message?: string } | undefined;

    function connect(connectInfo?: { name?: string }): Port;
    function sendMessage(message: unknown, responseCallback?: (response: unknown) => void): void;

    const onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: MessageSender,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };

    const onConnect: {
      addListener(listener: (port: Port) => void): void;
    };
  }

  namespace tabs {
    function sendMessage(
      tabId: number,
      message: unknown,
      responseCallback?: (response: unknown) => void
    ): void;
  }

  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    }

    const local: StorageArea;
    const sync: StorageArea;
  }

  namespace devtools {
    namespace panels {
      interface ExtensionPanel {
        onShown: { addListener(listener: (window: Window) => void): void };
        onHidden: { addListener(listener: () => void): void };
      }
      function create(
        title: string,
        iconPath: string,
        pagePath: string,
        callback?: (panel: ExtensionPanel) => void
      ): void;
    }
    namespace inspectedWindow {
      const tabId: number;
      function eval(
        expression: string,
        callback?: (result: unknown, exceptionInfo?: unknown) => void
      ): void;
    }
    namespace network {
      const onNavigated: {
        addListener(listener: (url: string) => void): void;
      };
    }
  }
}
