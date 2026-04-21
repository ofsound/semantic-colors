"use strict";
(() => {
  // extension/src/background.ts
  var panelPorts = /* @__PURE__ */ new Map();
  chrome.runtime.onConnect.addListener((port) => {
    if (!port.name.startsWith("panel:")) return;
    const tabId = Number(port.name.slice("panel:".length));
    if (!Number.isFinite(tabId)) return;
    panelPorts.set(tabId, port);
    port.onMessage.addListener((message) => {
      const envelope = message;
      if (envelope?.source !== "panel") return;
      const targetTabId = envelope.tabId ?? tabId;
      try {
        chrome.tabs.sendMessage(targetTabId, envelope.payload);
      } catch {
      }
    });
    port.onDisconnect.addListener(() => {
      if (panelPorts.get(tabId) === port) {
        panelPorts.delete(tabId);
      }
    });
  });
  chrome.runtime.onMessage.addListener((message, sender) => {
    const envelope = message;
    if (envelope?.source !== "content") return;
    const tabId = sender.tab?.id;
    if (tabId === void 0) return;
    const port = panelPorts.get(tabId);
    if (!port) return;
    try {
      port.postMessage(envelope);
    } catch {
      panelPorts.delete(tabId);
    }
  });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2JhY2tncm91bmQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IHBhbmVsUG9ydE5hbWUgfSBmcm9tICcuL3NoYXJlZC9tZXNzYWdpbmcnO1xuaW1wb3J0IHR5cGUgeyBDb250ZW50TWVzc2FnZUVudmVsb3BlLCBQYW5lbE1lc3NhZ2VFbnZlbG9wZSB9IGZyb20gJy4vc2hhcmVkL21lc3NhZ2luZyc7XG5pbXBvcnQgdHlwZSB7IFBhbmVsVG9Db250ZW50TWVzc2FnZSB9IGZyb20gJy4vc2hhcmVkL3R5cGVzJztcblxuY29uc3QgcGFuZWxQb3J0cyA9IG5ldyBNYXA8bnVtYmVyLCBjaHJvbWUucnVudGltZS5Qb3J0PigpO1xuXG5jaHJvbWUucnVudGltZS5vbkNvbm5lY3QuYWRkTGlzdGVuZXIoKHBvcnQpID0+IHtcbiAgaWYgKCFwb3J0Lm5hbWUuc3RhcnRzV2l0aCgncGFuZWw6JykpIHJldHVybjtcbiAgY29uc3QgdGFiSWQgPSBOdW1iZXIocG9ydC5uYW1lLnNsaWNlKCdwYW5lbDonLmxlbmd0aCkpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZSh0YWJJZCkpIHJldHVybjtcblxuICBwYW5lbFBvcnRzLnNldCh0YWJJZCwgcG9ydCk7XG5cbiAgcG9ydC5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2UpID0+IHtcbiAgICBjb25zdCBlbnZlbG9wZSA9IG1lc3NhZ2UgYXMgUGFuZWxNZXNzYWdlRW52ZWxvcGU7XG4gICAgaWYgKGVudmVsb3BlPy5zb3VyY2UgIT09ICdwYW5lbCcpIHJldHVybjtcbiAgICBjb25zdCB0YXJnZXRUYWJJZCA9IGVudmVsb3BlLnRhYklkID8/IHRhYklkO1xuICAgIHRyeSB7XG4gICAgICBjaHJvbWUudGFicy5zZW5kTWVzc2FnZSh0YXJnZXRUYWJJZCwgZW52ZWxvcGUucGF5bG9hZCBzYXRpc2ZpZXMgUGFuZWxUb0NvbnRlbnRNZXNzYWdlKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFRhYiBtaWdodCBoYXZlIG5hdmlnYXRlZCBhd2F5IG9yIGJlIHJlc3RyaWN0ZWQuXG4gICAgfVxuICB9KTtcblxuICBwb3J0Lm9uRGlzY29ubmVjdC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gICAgaWYgKHBhbmVsUG9ydHMuZ2V0KHRhYklkKSA9PT0gcG9ydCkge1xuICAgICAgcGFuZWxQb3J0cy5kZWxldGUodGFiSWQpO1xuICAgIH1cbiAgfSk7XG59KTtcblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIpID0+IHtcbiAgY29uc3QgZW52ZWxvcGUgPSBtZXNzYWdlIGFzIENvbnRlbnRNZXNzYWdlRW52ZWxvcGU7XG4gIGlmIChlbnZlbG9wZT8uc291cmNlICE9PSAnY29udGVudCcpIHJldHVybjtcbiAgY29uc3QgdGFiSWQgPSBzZW5kZXIudGFiPy5pZDtcbiAgaWYgKHRhYklkID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgY29uc3QgcG9ydCA9IHBhbmVsUG9ydHMuZ2V0KHRhYklkKTtcbiAgaWYgKCFwb3J0KSByZXR1cm47XG4gIHRyeSB7XG4gICAgcG9ydC5wb3N0TWVzc2FnZShlbnZlbG9wZSk7XG4gIH0gY2F0Y2gge1xuICAgIHBhbmVsUG9ydHMuZGVsZXRlKHRhYklkKTtcbiAgfVxufSk7XG5cbi8vIEV4cG9ydCBub3RoaW5nOyBJSUZFIGJ1bmRsZSBleHBlY3RzIHRvcC1sZXZlbCByZWdpc3RyYXRpb25zIG9ubHkuXG52b2lkIHBhbmVsUG9ydE5hbWU7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7QUFJQSxNQUFNLGFBQWEsb0JBQUksSUFBaUM7QUFFeEQsU0FBTyxRQUFRLFVBQVUsWUFBWSxDQUFDLFNBQVM7QUFDN0MsUUFBSSxDQUFDLEtBQUssS0FBSyxXQUFXLFFBQVEsRUFBRztBQUNyQyxVQUFNLFFBQVEsT0FBTyxLQUFLLEtBQUssTUFBTSxTQUFTLE1BQU0sQ0FBQztBQUNyRCxRQUFJLENBQUMsT0FBTyxTQUFTLEtBQUssRUFBRztBQUU3QixlQUFXLElBQUksT0FBTyxJQUFJO0FBRTFCLFNBQUssVUFBVSxZQUFZLENBQUMsWUFBWTtBQUN0QyxZQUFNLFdBQVc7QUFDakIsVUFBSSxVQUFVLFdBQVcsUUFBUztBQUNsQyxZQUFNLGNBQWMsU0FBUyxTQUFTO0FBQ3RDLFVBQUk7QUFDRixlQUFPLEtBQUssWUFBWSxhQUFhLFNBQVMsT0FBdUM7QUFBQSxNQUN2RixRQUFRO0FBQUEsTUFFUjtBQUFBLElBQ0YsQ0FBQztBQUVELFNBQUssYUFBYSxZQUFZLE1BQU07QUFDbEMsVUFBSSxXQUFXLElBQUksS0FBSyxNQUFNLE1BQU07QUFDbEMsbUJBQVcsT0FBTyxLQUFLO0FBQUEsTUFDekI7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNILENBQUM7QUFFRCxTQUFPLFFBQVEsVUFBVSxZQUFZLENBQUMsU0FBUyxXQUFXO0FBQ3hELFVBQU0sV0FBVztBQUNqQixRQUFJLFVBQVUsV0FBVyxVQUFXO0FBQ3BDLFVBQU0sUUFBUSxPQUFPLEtBQUs7QUFDMUIsUUFBSSxVQUFVLE9BQVc7QUFDekIsVUFBTSxPQUFPLFdBQVcsSUFBSSxLQUFLO0FBQ2pDLFFBQUksQ0FBQyxLQUFNO0FBQ1gsUUFBSTtBQUNGLFdBQUssWUFBWSxRQUFRO0FBQUEsSUFDM0IsUUFBUTtBQUNOLGlCQUFXLE9BQU8sS0FBSztBQUFBLElBQ3pCO0FBQUEsRUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
