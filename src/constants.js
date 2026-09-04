// ── App-wide constants ─────────────────────────────────────────
// Non-seed values that are safe to ship in production. No mock/fake records.

export const OTP_PURPOSES = {
  LOGIN:               'LOGIN_OTP',
  PAYMENT_COLLECTION:  'PAYMENT_COLLECTION_OTP',
  DELIVERY:            'DELIVERY_OTP',
};

export const ORDER_STATUSES = [
  'NEW', 'ACCEPTED', 'HOLD', 'PROCESSING',
  'READY_TO_DISPATCH', 'PARTIALLY_DISPATCHED', 'FULLY_DISPATCHED',
  'OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED',
];

export const COLLECTION_STATUSES = [
  'COLLECTED', 'HANDOVER_PENDING', 'ACCOUNT_VERIFICATION',
  'ACCOUNT_VERIFIED', 'VERIFICATION_FAILED',
];
