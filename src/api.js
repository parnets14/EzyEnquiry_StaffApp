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

export default request;
