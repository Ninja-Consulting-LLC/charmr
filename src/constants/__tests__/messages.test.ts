import {MESSAGES} from '../messages';

describe('MESSAGES', () => {
  it('exposes user-facing strings', () => {
    expect(MESSAGES.RATE_LIMIT).toContain('5 free messages');
    expect(MESSAGES.MESSAGE_COPIED).toContain('Copied');
    expect(MESSAGES.REPLY_MODAL_COPY).toBe('Copy');
  });
});
