/**
 * App-wide constants shared across screens and AppContext.
 */

/**
 * OTP challenge purpose identifiers.
 * Used to distinguish what action an in-progress OTP verification is for.
 */
export const OTP_PURPOSES = {
  /** OTP required to confirm delivery of a dispatch */
  DELIVERY: 'Delivery Confirmation',
  /** OTP required to verify a payment collection */
  PAYMENT_COLLECTION: 'Payment Collection',
};
