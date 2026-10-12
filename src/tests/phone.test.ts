import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, cleanRawPhone, maskPhoneNumber } from '../lib/phone';

describe('Phone Normalization & Validation', () => {
  it('cleans scientific notation and float decimals from Excel imports', () => {
    expect(cleanRawPhone('201012345678.0')).toBe('201012345678');
    expect(cleanRawPhone(' 01012345678  ')).toBe('01012345678');
  });

  it('correctly normalizes valid Egyptian numbers', () => {
    // Local format with leading zero
    const res1 = normalizePhoneNumber('01012345678', 'EG');
    expect(res1.isValid).toBe(true);
    expect(res1.normalized).toBe('201012345678');
    expect(res1.status).toBe('valid');

    // International format with +20
    const res2 = normalizePhoneNumber('+201012345678', 'EG');
    expect(res2.isValid).toBe(true);
    expect(res2.normalized).toBe('201012345678');

    // 0020 prefix
    const res3 = normalizePhoneNumber('00201012345678', 'EG');
    expect(res3.isValid).toBe(true);
    expect(res3.normalized).toBe('201012345678');
  });

  it('correctly handles international numbers (Saudi Arabia, US)', () => {
    // Saudi Arabia
    const resSA = normalizePhoneNumber('+966501234567', 'SA');
    expect(resSA.isValid).toBe(true);
    expect(resSA.normalized).toBe('966501234567');

    // US
    const resUS = normalizePhoneNumber('+14155552671', 'US');
    expect(resUS.isValid).toBe(true);
    expect(resUS.normalized).toBe('14155552671');
  });

  it('rejects invalid or too short numbers without blindly prepending country code', () => {
    const res = normalizePhoneNumber('12345', 'EG');
    expect(res.isValid).toBe(false);
    expect(res.status).toBe('invalid');
  });

  it('properly masks phone numbers for privacy', () => {
    expect(maskPhoneNumber('201012345678')).toBe('+2010******78');
    expect(maskPhoneNumber('123')).toBe('***');
  });
});
