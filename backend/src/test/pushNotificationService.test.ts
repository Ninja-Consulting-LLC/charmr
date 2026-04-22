import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {firebaseAdmin} from '../config/firebase-admin';
import {sendPushNotification} from '../services/pushNotificationService';

describe('pushNotificationService', () => {
  let send: jest.MockedFunction<any>;

  beforeEach(() => {
    send = jest.fn() as jest.MockedFunction<any>;
    jest.spyOn(firebaseAdmin as any, 'messaging').mockReturnValue({send});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends FCM message and returns id', async () => {
    send.mockResolvedValue('msg-1');
    const id = await sendPushNotification('fcm-ios-token', 'T', 'B', {
      type: 'coach',
    });
    expect(send).toHaveBeenCalled();
    expect(id).toBe('msg-1');
  });

  it('classifies quota errors', async () => {
    send.mockRejectedValue(new Error('messaging/quota-exceeded'));
    await expect(
      sendPushNotification('android-token', 'T', 'B'),
    ).rejects.toThrow();
  });

  it('classifies invalid token errors', async () => {
    send.mockRejectedValue(
      new Error('messaging/invalid-registration-token'),
    );
    await expect(
      sendPushNotification('android-token', 'T', 'B'),
    ).rejects.toThrow();
  });

  it('classifies generic errors', async () => {
    send.mockRejectedValue(new Error('other'));
    await expect(
      sendPushNotification('android-token', 'T', 'B'),
    ).rejects.toThrow();
  });
});
