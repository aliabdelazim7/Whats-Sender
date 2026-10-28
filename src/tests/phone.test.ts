import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, cleanRawPhone, maskPhoneNumber, detectCountryFromPhone } from '../lib/phone';

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
    expect(res1.country).toBe('EG');

    // International format with +20
    const res2 = normalizePhoneNumber('+201012345678', 'EG');
    expect(res2.isValid).toBe(true);
    expect(res2.normalized).toBe('201012345678');
    expect(res2.country).toBe('EG');

    // 0020 prefix
    const res3 = normalizePhoneNumber('00201012345678', 'EG');
    expect(res3.isValid).toBe(true);
    expect(res3.normalized).toBe('201012345678');
    expect(res3.country).toBe('EG');
  });

  it('strictly classifies country calling codes without + even when defaultCountry is EG', () => {
    // Saudi Arabia (966) without leading '+'
    const resSA = normalizePhoneNumber('966535547623', 'EG');
    expect(resSA.isValid).toBe(true);
    expect(resSA.normalized).toBe('966535547623');
    expect(resSA.country).toBe('SA');

    // Egypt (20) without leading '+'
    const resEG = normalizePhoneNumber('201012345678', 'EG');
    expect(resEG.isValid).toBe(true);
    expect(resEG.normalized).toBe('201012345678');
    expect(resEG.country).toBe('EG');

    // UAE (971) without leading '+'
    const resAE = normalizePhoneNumber('971501234567', 'EG');
    expect(resAE.isValid).toBe(true);
    expect(resAE.normalized).toBe('971501234567');
    expect(resAE.country).toBe('AE');

    // Kuwait (965) without leading '+'
    const resKW = normalizePhoneNumber('96550123456', 'EG');
    expect(resKW.isValid).toBe(true);
    expect(resKW.country).toBe('KW');

    // Qatar (974)
    const resQA = normalizePhoneNumber('97444123456', 'EG');
    expect(resQA.isValid).toBe(true);
    expect(resQA.country).toBe('QA');
  });

  it('detects country correctly via detectCountryFromPhone', () => {
    expect(detectCountryFromPhone('966535547623')).toBe('SA');
    expect(detectCountryFromPhone('+966535547623')).toBe('SA');
    expect(detectCountryFromPhone('201012345678')).toBe('EG');
    expect(detectCountryFromPhone('+201012345678')).toBe('EG');
    expect(detectCountryFromPhone('01012345678')).toBe('EG');
    expect(detectCountryFromPhone('0535547623')).toBe('SA');
    expect(detectCountryFromPhone('971501234567')).toBe('AE');
    expect(detectCountryFromPhone('96550123456')).toBe('KW');
  });

  it('correctly handles international numbers (Saudi Arabia, US)', () => {
    // Saudi Arabia
    const resSA = normalizePhoneNumber('+966501234567', 'SA');
    expect(resSA.isValid).toBe(true);
    expect(resSA.normalized).toBe('966501234567');
    expect(resSA.country).toBe('SA');

    // US
    const resUS = normalizePhoneNumber('+14155552671', 'US');
    expect(resUS.isValid).toBe(true);
    expect(resUS.normalized).toBe('14155552671');
    expect(resUS.country).toBe('US');
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
