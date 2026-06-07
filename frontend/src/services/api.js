const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Per Phase 2.4 of docs/AUDIT_FIX_PLAN.md — env-derived API timeout.
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 10000;

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw err;
    }
  }

  // Departments
  getDepartments(offset = 0, limit = 50) {
    return this.request(`/api/v1/departments?offset=${offset}&limit=${limit}`);
  }

  getDepartment(id) {
    return this.request(`/api/v1/departments/${id}`);
  }

  getDepartmentProcesses(id) {
    return this.request(`/api/v1/departments/${id}/processes`);
  }

  getDepartmentAIStack(id) {
    return this.request(`/api/v1/departments/${id}/ai-stack`);
  }

  getDepartmentROI(id) {
    return this.request(`/api/v1/departments/${id}/roi`);
  }

  // Processes
  getProcess(id) {
    return this.request(`/api/v1/processes/${id}`);
  }

  // Datasets
  getDatasets() {
    return this.request('/api/v1/datasets');
  }

  uploadDataset(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/api/v1/datasets/${id}/upload`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }

  // Models
  getModels() {
    return this.request('/api/v1/models');
  }

  trainModel(data) {
    return this.request('/api/v1/models', { method: 'POST', body: JSON.stringify(data) });
  }

  predict(modelId, data) {
    return this.request(`/api/v1/models/${modelId}/predict`, { method: 'POST', body: JSON.stringify(data) });
  }

  // Jobs
  getJobs() {
    return this.request('/api/v1/jobs');
  }

  getJob(id) {
    return this.request(`/api/v1/jobs/${id}`);
  }

  // Health
  healthCheck() {
    return this.request('/api/v1/health');
  }
}

export const api = new ApiClient(API_BASE);
