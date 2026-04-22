import {afterEach, describe, expect, it, jest} from '@jest/globals';

const verify = jest.fn((cb: (err?: Error) => void) => cb()) as jest.MockedFunction<
  any
>;
const sendMail = jest.fn() as jest.MockedFunction<any>;
sendMail.mockResolvedValue({messageId: 'mid'});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify,
    sendMail,
  })),
}));

describe('services/email', () => {
  const original = process.env;

  afterEach(() => {
    process.env = {...original};
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('createEmailService uses mock transport when CHARMR_DEV_MOCK_EMAIL=1', async () => {
    process.env = {
      ...original,
      CHARMR_DEV_MOCK_EMAIL: '1',
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    jest.resetModules();
    const {createEmailService} = await import('../services/email');
    const svc = createEmailService({
      host: 'h',
      port: 1,
      secure: false,
      defaultFrom: 'from@x.com',
    });
    await svc.sendEmail({to: 't@x.com', subject: 's', text: 'body'});
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('createSupportEmailService sends support and confirmation', async () => {
    process.env = {
      ...original,
      CHARMR_DEV_MOCK_EMAIL: '1',
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    jest.resetModules();
    const {createEmailService, createSupportEmailService} = await import(
      '../services/email'
    );
    const base = createEmailService({
      host: 'h',
      port: 1,
      secure: false,
      defaultFrom: 'from@x.com',
    });
    const support = createSupportEmailService(base, 'support@x.com');
    await support.sendSupportRequest({
      userId: 'u',
      email: 'user@x.com',
      message: 'help',
      plan: 'free',
      dailyMessagesUsed: 1,
      dailyMessageLimit: 10,
      extraMessages: 0,
      name: 'N',
    });
  });

  it('createEmailService sends via nodemailer when mock email is off', async () => {
    process.env = {
      ...original,
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    delete process.env.CHARMR_DEV_MOCK_EMAIL;
    jest.resetModules();
    const {createEmailService} = await import('../services/email');
    const svc = createEmailService({
      host: 'h',
      port: 1,
      secure: false,
      defaultFrom: 'from@x.com',
    });
    await svc.sendEmail({to: 't@x.com', subject: 's', text: 'body'});
    expect(sendMail).toHaveBeenCalled();
  });

  it('createEmailService propagates sendMail failures', async () => {
    process.env = {
      ...original,
      NODE_ENV: 'test',
      OPENAI_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
    };
    delete process.env.CHARMR_DEV_MOCK_EMAIL;
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    jest.resetModules();
    const {createEmailService} = await import('../services/email');
    const svc = createEmailService({
      host: 'h',
      port: 1,
      secure: false,
      defaultFrom: 'from@x.com',
    });
    await expect(
      svc.sendEmail({to: 't@x.com', subject: 's', text: 'body'}),
    ).rejects.toThrow('smtp down');
  });
});
