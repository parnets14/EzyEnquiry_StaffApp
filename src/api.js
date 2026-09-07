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
    if (token) headers.Authorization = `Bearer ${token}`;
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

  if (!response.ok || !data?.success) {
    return {
      success: false,
      message: data?.message || 'Something went wrong. Please try again in a moment.',
      status: response.status,
    };
  }

  return { success: true, message: data.message, data: data.data };
};

// Build a ?query string from a params object (skips empty/null/undefined values).
const toQuery = (params = {}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  staffSendOtp: mobile =>
    request('/auth/staff/send-otp', { method: 'POST', body: { mobile } }),
  staffVerifyOtp: (mobile, otp) =>
    request('/auth/staff/verify-otp', { method: 'POST', body: { mobile, otp } }),
};

// ── Sales Orders (company-scoped, read-only) ─────────────────
export const orderApi = {
  list: (params = {}) => request(`/staff/orders${toQuery(params)}`, { auth: true }),
  get:  id            => request(`/staff/orders/${id}`, { auth: true }),
};

// ── Invoices (read + record payment) ─────────────────────────
export const invoiceApi = {
  list:          (params = {}) => request(`/staff/invoices${toQuery(params)}`, { auth: true }),
  get:           id            => request(`/staff/invoices/${id}`, { auth: true }),
  summary:       ()            => request('/staff/invoices/summary', { auth: true }),
  recordPayment: (id, body)    =>
    request(`/staff/invoices/${id}/payment`, { method: 'POST', auth: true, body }),
};

// ── Dispatches (read-only for staff) ─────────────────────────
export const dispatchApi = {
  list: (params = {}) => request(`/staff/dispatches${toQuery(params)}`, { auth: true }),
  get:  id            => request(`/staff/dispatches/${id}`, { auth: true }),
};

// ── Customers (create + list; scoped to company) ─────────────
export const customerApi = {
  list:    (params = {}) => request(`/staff/customers${toQuery(params)}`, { auth: true }),
  listAll: (params = {}) => request(`/staff/customers${toQuery({ ...params, scope: 'all' })}`, { auth: true }),
  get:     id            => request(`/staff/customers/${id}`, { auth: true }),
  create:  body          => request('/staff/customers', { method: 'POST', auth: true, body }),
};

// ── Quotations (list + create; staff creates, admin approves) ─
export const quotationApi = {
  list:   (params = {}) => request(`/staff/quotations${toQuery(params)}`, { auth: true }),
  get:    id            => request(`/staff/quotations/${id}`, { auth: true }),
  create: body          => request('/staff/quotations', { method: 'POST', auth: true, body }),
};

// ── Products (catalog search, read-only) ─────────────────────
export const productApi = {
  list: (params = {}) => request(
    `/staff/products${toQuery({ limit: 500, _t: Date.now(), ...params })}`,
    { auth: true }
  ),
};

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  list:         (params = {}) => request(`/staff/notifications${toQuery(params)}`, { auth: true }),
  markRead:     id            => request(`/staff/notifications/${id}/read`, { method: 'PATCH', auth: true }),
  markAllRead:  ()            => request('/staff/notifications/mark-all-read', { method: 'PATCH', auth: true }),
  delete:       id            => request(`/staff/notifications/${id}`, { method: 'DELETE', auth: true }),
};

export default request;
