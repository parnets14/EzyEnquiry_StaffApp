import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from './config';

const TIMEOUT_MS = 15000;

// Low-level JSON request with timeout and bearer token support.
const request = async (path, { method = 'GET', body, auth = false } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.token);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    // The fetch itself failed — server unreachable, DNS/host wrong, or timeout.
    const message =
      err?.name === 'AbortError'
        ? 'The server took too long to respond. Please try again.'
        : 'Cannot reach the server. Make sure you have internet and try again.';
    return { success: false, message, networkError: true };
  }
  clearTimeout(timer);

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // The server responded (even with an error status). Prefer its message so
  // cases like "not a registered staff member" reach the user unchanged.
  if (!response.ok || !data?.success) {
    return {
      success: false,
      message:
        data?.message ||
        'Something went wrong. Please try again in a moment.',
      status: response.status,
    };
  }

  return { success: true, message: data.message, data: data.data };
};

export const authApi = {
  // Request a login OTP for a staff mobile registered in HR Employee Management.
  staffSendOtp: mobile =>
    request('/auth/staff/send-otp', { method: 'POST', body: { mobile } }),

  // Verify the OTP; on success returns { token, staff }.
  staffVerifyOtp: (mobile, otp) =>
    request('/auth/staff/verify-otp', { method: 'POST', body: { mobile, otp } }),
};

// Build a ?query string from a params object (skips empty values).
const toQuery = (params = {}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

// Sales Orders (company-scoped, read-only for staff).
export const orderApi = {
  list: (params = {}) => request(`/staff/orders${toQuery(params)}`, { auth: true }),
  get:  id            => request(`/staff/orders/${id}`, { auth: true }),
};

// Invoices (company-scoped) + record payment (the Pay button).
export const invoiceApi = {
  list: (params = {}) => request(`/staff/invoices${toQuery(params)}`, { auth: true }),
  get:  id            => request(`/staff/invoices/${id}`, { auth: true }),
  summary: ()         => request('/staff/invoices/summary', { auth: true }),
  recordPayment: (id, body) =>
    request(`/staff/invoices/${id}/payment`, { method: 'POST', auth: true, body }),
};

export default request;
