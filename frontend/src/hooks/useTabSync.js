// useTabSync.js · Iter 64 · §102.12 (multi-tab state sync)
// BroadcastChannel-based pub/sub for cross-tab state.

import { useEffect, useRef } from 'react';

const channels = {};

function getChannel(name) {
  if (!channels[name]) {
    channels[name] = ('BroadcastChannel' in window)
      ? new BroadcastChannel(`agentic-${name}`)
      : null;
  }
  return channels[name];
}

/**
 * Publish a message to all open tabs subscribed to this channel.
 */
export function publishTab(channelName, payload) {
  const ch = getChannel(channelName);
  if (ch) {
    try { ch.postMessage({ ts: Date.now(), payload }); }
    catch (_) { /* ignore */ }
  }
  // also storage event fallback
  try {
    localStorage.setItem(`tabsync:${channelName}`,
      JSON.stringify({ ts: Date.now(), payload }));
    setTimeout(() => localStorage.removeItem(`tabsync:${channelName}`), 100);
  } catch (_) {}
}

/**
 * Subscribe to messages from other tabs on this channel.
 */
export function useTabSync(channelName, onMessage) {
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const ch = getChannel(channelName);
    const cbBC = (e) => { try { handlerRef.current?.(e.data?.payload); } catch (_) {} };
    const cbStorage = (e) => {
      if (e.key === `tabsync:${channelName}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handlerRef.current?.(data.payload);
        } catch (_) {}
      }
    };
    if (ch) ch.addEventListener('message', cbBC);
    window.addEventListener('storage', cbStorage);
    return () => {
      if (ch) ch.removeEventListener('message', cbBC);
      window.removeEventListener('storage', cbStorage);
    };
  }, [channelName]);
}
