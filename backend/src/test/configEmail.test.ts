import {describe, expect, it} from '@jest/globals';
import {emailConfig} from '../config/email';

describe('config/email', () => {
  it('exports sane defaults', () => {
    expect(emailConfig.host).toBeTruthy();
    expect(typeof emailConfig.port).toBe('number');
    expect(typeof emailConfig.secure).toBe('boolean');
    expect(emailConfig.defaultFrom).toContain('@');
  });
});
