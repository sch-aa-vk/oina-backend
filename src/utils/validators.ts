import { Errors } from './errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;
const OTP_REGEX = /^\d{6}$/;

export const validateEmail = (email: string): void => {
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    throw Errors.VALIDATION_ERROR({ email: 'Must be a valid email address' });
  }
};

export const validatePassword = (password: string): void => {
  const errors: Record<string, string> = {};

  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Must be at least ${PASSWORD_MIN_LENGTH} characters`;
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password = 'Must contain at least one uppercase letter, one lowercase letter, one digit, and one special character';
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.VALIDATION_ERROR(errors);
  }
};

export const validateOTPCode = (code: string): void => {
  if (!code || !OTP_REGEX.test(code)) {
    throw Errors.VALIDATION_ERROR({ code: 'Must be a 6-digit numeric code' });
  }
};

export const validateRegisterPayload = (payload: { email?: string; password?: string }): void => {
  const errors: Record<string, string> = {};

  if (!payload.email) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(payload.email.trim())) {
    errors.email = 'Must be a valid email address';
  }

  if (!payload.password) {
    errors.password = 'Password is required';
  } else if (payload.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Must be at least ${PASSWORD_MIN_LENGTH} characters`;
  } else if (!PASSWORD_REGEX.test(payload.password)) {
    errors.password = 'Must contain at least one uppercase letter, one lowercase letter, one digit, and one special character';
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.VALIDATION_ERROR(errors);
  }
};

export const validateLoginPayload = (payload: { email?: string; password?: string }): void => {
  const errors: Record<string, string> = {};

  if (!payload.email) errors.email = 'Email is required';
  if (!payload.password) errors.password = 'Password is required';

  if (Object.keys(errors).length > 0) {
    throw Errors.VALIDATION_ERROR(errors);
  }
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export const validateProfileUpdatePayload = (payload: {
  displayName?: unknown;
  bio?: unknown;
  username?: unknown;
}): void => {
  const errors: Record<string, string> = {};

  if (payload.displayName !== undefined) {
    if (typeof payload.displayName !== 'string') {
      errors.displayName = 'Must be a string';
    } else {
      const trimmed = payload.displayName.trim();
      if (trimmed.length < 1) {
        errors.displayName = 'Must be at least 1 character';
      } else if (trimmed.length > 100) {
        errors.displayName = 'Must be at most 100 characters';
      }
    }
  }

  if (payload.bio !== undefined) {
    if (typeof payload.bio !== 'string') {
      errors.bio = 'Must be a string';
    } else if (payload.bio.length > 500) {
      errors.bio = 'Must be at most 500 characters';
    }
  }

  if (payload.username !== undefined) {
    if (typeof payload.username !== 'string') {
      errors.username = 'Must be a string';
    } else if (!USERNAME_REGEX.test(payload.username)) {
      errors.username = 'Must be 3-30 characters and contain only letters, numbers, and underscores';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.VALIDATION_ERROR(errors);
  }
};

export const validateResetPasswordPayload = (payload: {
  email?: string;
  code?: string;
  newPassword?: string;
}): void => {
  const errors: Record<string, string> = {};

  if (!payload.email) errors.email = 'Email is required';
  if (!payload.code || !OTP_REGEX.test(payload.code)) errors.code = 'Must be a 6-digit numeric code';
  if (!payload.newPassword) {
    errors.newPassword = 'New password is required';
  } else if (payload.newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Must be at least ${PASSWORD_MIN_LENGTH} characters`;
  } else if (!PASSWORD_REGEX.test(payload.newPassword)) {
    errors.newPassword = 'Must contain at least one uppercase letter, one lowercase letter, one digit, and one special character';
  }

  if (Object.keys(errors).length > 0) {
    throw Errors.VALIDATION_ERROR(errors);
  }
};
