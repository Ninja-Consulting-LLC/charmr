import {logger} from '../utils/logger';

const warn = (feature: string) => {
  const message = `[web-preview] ${feature} is unavailable on web. Returning a no-op result.`;
  console.warn(message);
  logger.revenueCat.warn(message);
};

export const initializeRevenueCat = async () => {
  warn('RevenueCat initialization');
};

export const simulateProEntitlement = async (_userId: string) => {
  warn('simulateProEntitlement');
  return null;
};

export const getProPaywall = async () => {
  warn('getProPaywall');
  return null;
};

export const getMessagePackPaywall = async () => {
  warn('getMessagePackPaywall');
  return null;
};

export const handlePurchase = async (_productId: string) => {
  warn('handlePurchase');
  return false;
};

export const getSubscriptions = async () => {
  warn('getSubscriptions');
  return [];
};

export const updateSubscription = async (_subscriptionId: string, _data: any) => {
  warn('updateSubscription');
  return null;
};
