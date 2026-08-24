const API_BASE = '/api';

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

export const updateIncidentActionStatus = async (id, actionId, status) => {
  const res = await fetch(`${API_BASE}/incidents/${id}/actions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionId, status })
  });
  if (!res.ok) throw new Error('Failed to update action status');
  return res.json();
};

export const triggerDemoMode = async () => {
  const res = await fetch(`${API_BASE}/simulator/demo`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger Demo Mode');
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

export const getMerchantBaseline = async (merchantId) => {
  const res = await fetch(`${API_BASE}/transactions/baseline?merchantId=${merchantId}`);
  if (!res.ok) throw new Error('Failed to fetch merchant baseline');
  return res.json();
};

export const submitIncidentFeedback = async (id, feedback) => {
  const res = await fetch(`${API_BASE}/transactions/incidents/${id}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback })
  });
  if (!res.ok) throw new Error('Failed to submit operator feedback');
  return res.json();
};
