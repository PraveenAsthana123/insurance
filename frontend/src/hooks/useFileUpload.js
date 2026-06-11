// useFileUpload.js · Iter 65 · §102.5.5 + §102.3.3 (resumable upload + recovery)
// Chunked uploads · localStorage progress · resume on retry.

import { useCallback, useState } from 'react';

const API = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8001';
const CHUNK_SIZE = 1024 * 1024; // 1 MB

function uploadKey(file) {
  return `upload:${file.name}:${file.size}`;
}

export function useFileUpload({ endpoint = `${API}/api/v1/files/chunk` } = {}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const startUpload = useCallback(async (file) => {
    if (!file) return;
    setStatus('uploading');
    setError(null);

    const key = uploadKey(file);
    const startChunk = parseInt(localStorage.getItem(key) || '0', 10);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = startChunk; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const fd = new FormData();
        fd.append('chunk', chunk);
        fd.append('name', file.name);
        fd.append('index', String(i));
        fd.append('total', String(totalChunks));

        const r = await fetch(endpoint, { method: 'POST', body: fd });
        if (!r.ok) throw new Error(`chunk ${i} HTTP ${r.status}`);

        localStorage.setItem(key, String(i + 1));
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      localStorage.removeItem(key);
      setStatus('completed');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [endpoint]);

  const resumeUpload = useCallback((file) => startUpload(file), [startUpload]);

  return { startUpload, resumeUpload, progress, status, error };
}
