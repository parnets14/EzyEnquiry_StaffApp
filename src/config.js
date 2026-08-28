import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────
// Backend base URL
// ─────────────────────────────────────────────────────────────
// Set this to wherever your backend is reachable from the app:
//
//  • Real Android/iOS phone: use your computer's LAN IP and make sure the
//    phone is on the SAME Wi-Fi. Example: http://192.168.1.45:5000/api
//  • Android emulator: the host machine is reachable at http://10.0.2.2:5000/api
//  • iOS simulator: http://localhost:5000/api works directly
//
// The default below targets a real device on the local network.
const LAN_API = 'http://192.168.1.45:5000/api';
const ANDROID_EMULATOR_API = 'http://10.0.2.2:5000/api';
const IOS_SIMULATOR_API = 'http://localhost:5000/api';

// Flip this to true only when running on the Android emulator / iOS simulator.
const USE_SIMULATOR = false;

export const API_BASE_URL = USE_SIMULATOR
  ? Platform.OS === 'android'
    ? ANDROID_EMULATOR_API
    : IOS_SIMULATOR_API
  : LAN_API;

// Storage keys
export const STORAGE_KEYS = {
  token: 'staffapp.token',
  staff: 'staffapp.staff',
};
