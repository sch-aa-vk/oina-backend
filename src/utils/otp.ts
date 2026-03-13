import * as crypto from 'crypto';

const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 5;

export const generateOTPCode = (): string => {
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(OTP_LENGTH, '0');
};

export const getOTPExpiry = (): number => {
  return Math.floor(Date.now() / 1000) + 15 * 60;
};

export const isMaxAttemptsExceeded = (attempts: number): boolean => {
  return attempts >= MAX_OTP_ATTEMPTS;
};
