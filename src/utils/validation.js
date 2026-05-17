const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationInput({ fullName, email, password, roleId }) {
  const errors = [];

  // ── fullName ──────────────────────────────────────────────────────────────
  if (!fullName || typeof fullName !== 'string') {
    errors.push('fullName is required.');
  } else if (fullName.trim().length < 2) {
    errors.push('fullName must be at least 2 characters.');
  } else if (fullName.trim().length > 120) {
    errors.push('fullName must not exceed 120 characters.');
  }

  // ── email ─────────────────────────────────────────────────────────────────
  if (!email || typeof email !== 'string') {
    errors.push('email is required.');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('email must be a valid email address.');
  } else if (email.trim().length > 180) {
    errors.push('email must not exceed 180 characters.');
  }

  // ── password ──────────────────────────────────────────────────────────────
  if (!password || typeof password !== 'string') {
    errors.push('password is required.');
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`password must not exceed ${PASSWORD_MAX_LENGTH} characters.`);
  } else {
    if (!/[A-Z]/.test(password)) errors.push('password must contain at least one uppercase letter.');
    if (!/[a-z]/.test(password)) errors.push('password must contain at least one lowercase letter.');
    if (!/[0-9]/.test(password)) errors.push('password must contain at least one digit.');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('password must contain at least one special character.');
  }

  // ── roleId ────────────────────────────────────────────────────────────────
  const parsedRoleId = Number(roleId);
  if (!roleId) {
    errors.push('roleId is required.');
  } else if (!Number.isInteger(parsedRoleId) || parsedRoleId < 1) {
    errors.push('roleId must be a positive integer.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateLoginInput({ email, password }) {
  const errors = [];

  if (!email || typeof email !== 'string') {
    errors.push('email is required.');
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push('email must be a valid email address.');
  }

  if (!password || typeof password !== 'string') {
    errors.push('password is required.');
  } else if (password.length < 1) {
    errors.push('password must not be empty.');
  }

  return { valid: errors.length === 0, errors };
}
