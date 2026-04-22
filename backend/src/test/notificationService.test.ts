import {beforeEach, describe, expect, it, jest} from '@jest/globals';
import {
  createNotificationService,
  NOTIFICATION_CONFIGS,
} from '../services/notificationService';
import {sendPushNotification} from '../services/pushNotificationService';
import {Database} from '../db/types';

jest.mock('../services/pushNotificationService', () => ({
  sendPushNotification: jest.fn(),
}));

describe('notificationService', () => {
  const mockSend = sendPushNotification as jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue('mid');
  });

  it('exports coach config with reasonable intervals', () => {
    expect(NOTIFICATION_CONFIGS.coach.checkInterval).toBeLessThan(
      365 * 24 * 60 * 60 * 1000,
    );
  });

  it('sendNotification skips when user missing', async () => {
    const db = {
      getUser: jest.fn() as jest.MockedFunction<any>,
      updateUser: jest.fn() as jest.MockedFunction<any>,
    };
    db.getUser.mockResolvedValue(null);
    const svc = createNotificationService(db as unknown as Database);
    await svc.sendNotification('u1', 'coach');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sendNotification skips anonymous installation-as-email users', async () => {
    const db = {
      getUser: jest.fn() as jest.MockedFunction<any>,
      updateUser: jest.fn() as jest.MockedFunction<any>,
    };
    db.getUser.mockResolvedValue({
      id: 'u1',
      email: 'install-1',
      installationId: 'install-1',
      deviceToken: 't',
    });
    const svc = createNotificationService(db as unknown as Database);
    await svc.sendNotification('u1', 'coach');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sendNotification skips without device token', async () => {
    const db = {
      getUser: jest.fn() as jest.MockedFunction<any>,
      updateUser: jest.fn() as jest.MockedFunction<any>,
    };
    db.getUser.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      installationId: 'x',
      deviceToken: null,
    });
    const svc = createNotificationService(db as unknown as Database);
    await svc.sendNotification('u1', 'coach');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sendNotification sends and updates notificationDates', async () => {
    const db = {
      getUser: jest.fn() as jest.MockedFunction<any>,
      updateUser: jest.fn() as jest.MockedFunction<any>,
    };
    db.getUser.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      installationId: 'x',
      deviceToken: 'tok',
      notificationDates: {},
    });
    db.updateUser.mockResolvedValue(undefined);
    const svc = createNotificationService(db as unknown as Database);
    await svc.sendNotification('u1', 'coach');
    expect(mockSend).toHaveBeenCalled();
    expect(db.updateUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({notificationDates: expect.any(Object)}),
    );
  });

  it('checkAndSendNotifications uses getUsersWithDeviceToken', async () => {
    const userRow = {
      id: 'u1',
      deviceToken: 't',
      notificationDates: {},
      email: 'a@b.com',
      installationId: 'other',
    };
    const db = {
      getUsersWithDeviceToken: jest.fn() as jest.MockedFunction<any>,
      getUser: jest.fn() as jest.MockedFunction<any>,
      updateUser: jest.fn() as jest.MockedFunction<any>,
    };
    db.getUsersWithDeviceToken.mockResolvedValue([userRow]);
    db.getUser.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      installationId: 'other',
      deviceToken: 't',
      notificationDates: {},
    });
    db.updateUser.mockResolvedValue(undefined);
    const svc = createNotificationService(db as unknown as Database);
    await svc.checkAndSendNotifications('coach');
    expect(db.getUsersWithDeviceToken).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalled();
  });

  it('checkAndSendNotifications swallows errors', async () => {
    const getUsersWithDeviceToken = jest.fn() as jest.MockedFunction<any>;
    getUsersWithDeviceToken.mockRejectedValue(new Error('fail'));
    const db = {
      getUsersWithDeviceToken,
    };
    const svc = createNotificationService(db as unknown as Database);
    await expect(
      svc.checkAndSendNotifications('coach'),
    ).resolves.toBeUndefined();
  });
});
