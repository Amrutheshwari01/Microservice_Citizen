/**
 * Indian Real-Application Standard Validators & Regular Expressions
 * Complies with UIDAI, Income Tax Dept, Election Commission of India (ECI),
 * MoRTH Parivahan, GSTN, and RBI standards.
 */

export const INDIAN_PATTERNS = {
  // Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-])[A-Za-z\d@$!%*?&#^_\-]{8,64}$/,

  // Indian Mobile: Starts with 6, 7, 8, or 9, exactly 10 digits (with optional +91 or 0 prefix)
  MOBILE: /^(?:(?:\+|0{0,2})91[\s-]?)?[6-9]\d{9}$/,

  // Standard Email
  EMAIL: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,

  // PAN Card: 5 uppercase letters (4th is status P/C/H/F/A/T/B/L/J/G), 4 digits, 1 uppercase letter
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,

  // Aadhaar: 12 digits, first digit cannot be 0 or 1. Supports formatted "XXXX XXXX XXXX" or 12 digits
  AADHAAR_FULL: /^[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$/,
  AADHAAR_LAST4: /^\d{4}$/,

  // Voter ID (EPIC): 3 letters followed by 7 digits (e.g., ABC1234567, KLR1234567)
  VOTER_ID: /^[A-Z]{3}[0-9]{7}$/,

  // Driving Licence: State code (2) + RTO code (2) + Year (4) + 7 digits (e.g. KA0120200012345)
  DRIVING_LICENCE: /^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/,

  // Indian Passport: 1 letter (A-Z except Q, X, Z) + 7 digits (e.g. A1234567)
  PASSPORT: /^[A-PR-WYa-pr-wy][1-9]\d{6}$/,

  // GSTIN: 2-digit state code + 10-digit PAN + 1 entity code + 'Z' + 1 checksum digit
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,

  // PIN Code: 6 digits, first digit 1-9
  PIN_CODE: /^[1-9][0-9]{5}$/,

  // Bank IFSC Code: 4 alphabetic chars + '0' + 6 alphanumeric chars (e.g., SBIN0004128)
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,

  // Bank Account Number: 9 to 18 digits
  BANK_ACCOUNT: /^\d{9,18}$/
};

/**
 * Validates password strength and returns rating
 */
export function evaluatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty', color: '#94a3b8' };
  
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&#^_\-]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 4) return { score, label: 'Medium', color: '#f59e0b' };
  return { score, label: 'Strong', color: '#22c55e' };
}

/**
 * Normalizes and validates Indian Mobile numbers
 */
export function formatIndianMobile(mobile) {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return mobile;
}
