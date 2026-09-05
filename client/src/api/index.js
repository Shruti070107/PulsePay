const API_BASE = '/api';

export const getAuthToken = () => sessionStorage.getItem('pulsepay_token');

export const authRequest = async (path, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rawMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null) || data.message;
    if (rawMsg && typeof rawMsg === 'string') {
      const isInternalLeak = /at\s+|node_modules|jwt_secret|passwordhash|mongodb|internal_error|illegal\s+arguments/i.test(rawMsg);
      if (!isInternalLeak) {
        throw new Error(rawMsg);
      }
    }
    if (res.status === 401) {
      throw new Error('Email or password is incorrect.');
    }
    if (res.status === 409) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    if (res.status === 400) {
      throw new Error('Invalid request details. Please check your inputs.');
    }
    if (res.status >= 500) {
      throw new Error('Account service is temporarily unavailable. Please try again shortly.');
    }
    throw new Error('Unable to complete the request. Please try again.');
  }
  return data;
};

export const registerUser = (payload) => authRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
export const loginUser = (payload) => authRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const getCurrentUser = () => authRequest('/auth/me');
export const logoutUser = () => authRequest('/auth/logout', { method: 'POST' });
export const runRecoveryMission = (payload = {}) => authRequest('/recovery/mission', { method: 'POST', body: JSON.stringify(payload) });
export const compareStrategies = (payload = {}) => authRequest('/recovery/compare-strategies', { method: 'POST', body: JSON.stringify(payload) });


// Incidents
export const getIncidents = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.severity) params.append('severity', filters.severity);
  
  const res = await fetch(`${API_BASE}/incidents?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
};

export const getIncident = async (id) => {
  const res = await fetch(`${API_BASE}/incidents/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch incident ${id}`);
  return res.json();
};

export const investigateIncident = async (id) => {
  const res = await fetch(`${API_BASE}/incidents/${id}/investigate`, { method: 'POST' });
  if (!res.ok) throw new Error('AI investigation failed');
  return res.json();
};

export const getIncidentInvestigations = async (id) => {
  const res = await fetch(`${API_BASE}/incidents/${id}/investigations`);
  if (!res.ok) throw new Error('Failed to fetch investigations history');
  return res.json();
};

export const updateIncidentStatus = async (id, status) => {
  const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
};

export const resolveIncident = async (id) => {
  const res = await fetch(`${API_BASE}/incidents/${id}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resolve incident');
  return res.json();
};

// Payments & Ledger
export const getPayments = async () => {
  const res = await fetch(`${API_BASE}/payments`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
};

export const getPaymentDetails = async (id) => {
  const res = await fetch(`${API_BASE}/payments/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch payment details ${id}`);
  return res.json();
};

export const getPaymentState = async (id) => {
  const res = await fetch(`${API_BASE}/payments/${id}/state`);
  if (!res.ok) throw new Error(`Failed to fetch payment state ${id}`);
  return res.json();
};

export const getPaymentTimeline = async (id) => {
  const res = await fetch(`${API_BASE}/payments/${id}/timeline`);
  if (!res.ok) throw new Error(`Failed to fetch timeline for payment ${id}`);
  return res.json();
};

export const getHealth = async () => {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch API health status');
  return res.json();
};

// ==========================================
// REVENUE RECOVERY APIS
// ==========================================

export const getRecoveryMetrics = async () => {
  const res = await fetch(`${API_BASE}/recovery/metrics`);
  if (!res.ok) throw new Error('Failed to fetch recovery metrics');
  return res.json();
};

export const scanRecoveryOpportunities = async (params = {}) => {
  const res = await fetch(`${API_BASE}/recovery/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to scan revenue at risk');
  return res.json();
};

export const getRecoveryOpportunities = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, val);
    }
  });

  const res = await fetch(`${API_BASE}/recovery/opportunities?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch recovery opportunities');
  return res.json();
};

export const getRecoveryOpportunity = async (id) => {
  const res = await fetch(`${API_BASE}/recovery/opportunities/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch recovery opportunity ${id}`);
  return res.json();
};

export const simulateRecovery = async (params = {}) => {
  const res = await fetch(`${API_BASE}/recovery/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || 'Failed to run recovery simulation';
    throw new Error(errorMsg);
  }
  return data;
};

export const executeRecovery = async (params = {}) => {
  const res = await fetch(`${API_BASE}/recovery/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || data.reason || 'Failed to execute recovery';
    throw new Error(errorMsg);
  }
  return data;
};

export const getRecoveryCampaigns = async () => {
  const res = await fetch(`${API_BASE}/recovery/campaigns`);
  if (!res.ok) throw new Error('Failed to fetch recovery campaigns');
  return res.json();
};

export const createRecoveryCampaign = async (data = {}) => {
  const res = await fetch(`${API_BASE}/recovery/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = resData.error?.message || resData.message || 'Failed to create recovery campaign';
    throw new Error(errorMsg);
  }
  return resData;
};

export const getRecoveryCampaign = async (id) => {
  const res = await fetch(`${API_BASE}/recovery/campaigns/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch campaign ${id}`);
  return res.json();
};

export const analyzeRecoveryWithAgent = async (params = {}) => {
  const res = await fetch(`${API_BASE}/recovery/agent/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || 'AI Recovery Agent analysis failed';
    throw new Error(errorMsg);
  }
  return data;
};

export const runRecoveryDemo = async (params = {}) => {
  const res = await fetch(`${API_BASE}/recovery/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || 'Failed to run recovery demo';
    throw new Error(errorMsg);
  }
  return data;
};

export const evaluateRecovery = async () => {
  const res = await fetch(`${API_BASE}/recovery/evaluate`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || 'Failed to evaluate recovery engine';
    throw new Error(errorMsg);
  }
  return data;
};

export const runRecoveryBenchmark = async (params = {}) => {
  const res = await fetch(`${API_BASE}/recovery/benchmark/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to run recovery benchmark');
  return res.json();
};

export const getLatestBenchmark = async () => {
  const res = await fetch(`${API_BASE}/recovery/benchmark/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest benchmark');
  return res.json();
};

export const getBenchmarkById = async (id) => {
  const res = await fetch(`${API_BASE}/recovery/benchmark/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark ${id}`);
  return res.json();
};

export const getBenchmarkResults = async (id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/recovery/benchmark/${id}/results?${query}`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark results`);
  return res.json();
};

export const getBenchmarkCalibration = async (id) => {
  const res = await fetch(`${API_BASE}/recovery/benchmark/${id}/calibration`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark calibration`);
  return res.json();
};

export const getBenchmarkScenarios = async (id) => {
  const res = await fetch(`${API_BASE}/recovery/benchmark/${id}/scenarios`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark scenarios`);
  return res.json();
};

export const getBenchmarkBaseline = async (id) => {
  const res = await fetch(`${API_BASE}/recovery/benchmark/${id}/baseline`);
  if (!res.ok) throw new Error(`Failed to fetch benchmark baseline`);
  return res.json();
};

// Simulator & Lab
export const triggerSimulation = async (scenario, count = 1) => {
  const paymentsCreated = [];
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${API_BASE}/simulator/${scenario}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`Simulation failed on step ${i + 1}`);
    const data = await res.json();
    paymentsCreated.push(data.paymentId);
  }
  return { success: true, paymentsCreated };
};

export const triggerIncidentDetection = async () => {
  const res = await fetch(`${API_BASE}/incidents/detect`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger detection');
  return res.json();
};

export const triggerMLTrain = async () => {
  const res = await fetch(`${API_BASE}/ml/train`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger model training');
  return res.json();
};

export const triggerAggregator = async () => {
  const res = await fetch(`${API_BASE}/simulator/run-aggregator`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger aggregator');
  return res.json();
};

export const clearDatabase = async () => {
  const res = await fetch(`${API_BASE}/simulator/clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear database');
  return res.json();
};

export const getMerchantBaseline = async (merchantId = '', hours = 24) => {
  const params = new URLSearchParams();
  if (merchantId) params.append('merchantId', merchantId);
  if (hours) params.append('hours', hours);
  const res = await fetch(`${API_BASE}/transactions/baseline?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch baseline metrics');
  return res.json();
};

export const runLabScenario = async (scenarioId, overrides = {}) => {
  const res = await fetch(`${API_BASE}/simulator/lab/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId, overrides })
  });
  if (!res.ok) throw new Error('Failed to run scenario lab');
  return res.json();
};

export const getLabReports = async () => {
  const res = await fetch(`${API_BASE}/simulator/lab/reports`);
  if (!res.ok) throw new Error('Failed to fetch lab reports');
  return res.json();
};

export const generateHistoricalData = async (params = {}) => {
  const res = await fetch(`${API_BASE}/simulator/lab/generate-historical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to generate historical baseline data');
  return res.json();
};

export const updateIncidentActionStatus = async (incidentId, actionId, status) => {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/action-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId, status })
  });
  if (!res.ok) throw new Error('Failed to update action status');
  return res.json();
};

export const submitIncidentFeedback = async (incidentId, feedback) => {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback })
  });
  if (!res.ok) throw new Error('Failed to submit incident feedback');
  return res.json();
};

export const getIncidentReplay = async (incidentId) => {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/replay`);
  if (!res.ok) throw new Error('Failed to fetch incident replay');
  return res.json();
};

export const runIncidentWhatIf = async (incidentId, params) => {
  const res = await fetch(`${API_BASE}/incidents/${incidentId}/what-if`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error('Failed to run incident what-if simulation');
  return res.json();
};

export const triggerDemoMode = async () => {
  const res = await fetch(`${API_BASE}/simulator/lab/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 'WEBHOOK_OUTAGE' })
  });
  if (!res.ok) throw new Error('Failed to trigger demo mode');
  return res.json();
};

export const validateDataset = async (records) => {
  const res = await fetch(`${API_BASE}/transactions/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  if (!res.ok) throw new Error('Failed to validate dataset');
  return res.json();
};

export const importDataset = async (records) => {
  const res = await fetch(`${API_BASE}/transactions/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
  if (!res.ok) throw new Error('Failed to import dataset');
  return res.json();
};

export const ingestReplayEvent = async (event) => {
  const res = await fetch(`${API_BASE}/transactions/ingest-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  if (!res.ok) throw new Error('Failed to ingest replay event');
  return res.json();
};

export const getLabScenarios = async () => {
  const res = await fetch(`${API_BASE}/simulator/lab/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch lab scenarios');
  return res.json();
};

export const triggerLabBaseline = async (count = 15000, seed = 42) => {
  const res = await fetch(`${API_BASE}/simulator/lab/generate-historical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, seed })
  });
  if (!res.ok) throw new Error('Failed to generate lab baseline');
  return res.json();
};

