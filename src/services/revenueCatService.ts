import {Platform} from 'react-native';
import Config from 'react-native-config';
import Purchases, {
  CustomerInfo,
  PurchasesConfiguration,
  PurchasesEntitlementInfo,
  PurchasesEntitlementInfos,
} from 'react-native-purchases';
import {config} from '../config/config';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import axiosInstance from './axiosInstance';
import {updateUserPlan} from './userService';

// Development configuration for testing in simulator
const REVENUECAT_DEV_API_KEY = Platform.select({
  ios: Config.REVENUECAT_DEV_API_KEY,
  android: Config.REVENUECAT_ANDROID_DEV_API_KEY,
  default: '',
});

// Production configuration
const REVENUECAT_PROD_API_KEY = Platform.select({
  ios: Config.REVENUECAT_PROD_API_KEY,
  android: Config.REVENUECAT_ANDROID_PROD_API_KEY,
  default: '',
});

export const initializeRevenueCat = async () => {
  try {
    const apiKey = config.revenueCatApiKey;
    if (!apiKey) {
      throw new Error('RevenueCat API key not found');
    }

    const purchasesConfig: PurchasesConfiguration = {
      apiKey,
    };
    await Purchases.configure(purchasesConfig);
    logger.revenueCat.info('RevenueCat initialized successfully');
  } catch (error) {
    logger.revenueCat.error('Failed to initialize RevenueCat:', error);
    if (error instanceof Error) {
      logger.revenueCat.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
  }
};

// Helper function to simulate pro entitlement in development
export const simulateProEntitlement = async (userId: string) => {
  if (!__DEV__) {
    logger.revenueCat.warn(
      'simulateProEntitlement can only be used in development mode',
    );
    return;
  }

  try {
    // In development, we can simulate the pro entitlement
    await Purchases.logIn(userId);
    const customerInfo = await Purchases.getCustomerInfo();

    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    // Create a mock pro entitlement
    const mockProEntitlement: PurchasesEntitlementInfo = {
      identifier: 'pro',
      isActive: true,
      willRenew: true,
      periodType: 'NORMAL',
      latestPurchaseDate: new Date(now).toISOString(),
      latestPurchaseDateMillis: now,
      originalPurchaseDate: new Date(now).toISOString(),
      originalPurchaseDateMillis: now,
      expirationDate: new Date(thirtyDaysFromNow).toISOString(),
      expirationDateMillis: thirtyDaysFromNow,
      store: 'APP_STORE',
      unsubscribeDetectedAt: null,
      unsubscribeDetectedAtMillis: null,
      billingIssueDetectedAt: null,
      billingIssueDetectedAtMillis: null,
      ownershipType: 'PURCHASED',
      productIdentifier: 'pro_monthly',
      productPlanIdentifier: 'monthly',
      isSandbox: true,
      verification: 'NOT_REQUESTED' as any, // Using any as a temporary workaround
    };

    // Create mock entitlements object
    const mockEntitlements: PurchasesEntitlementInfos = {
      ...customerInfo.entitlements,
      active: {
        ...customerInfo.entitlements.active,
        pro: mockProEntitlement,
      },
    };

    // Create mock customer info
    const mockCustomerInfo: CustomerInfo = {
      ...customerInfo,
      entitlements: mockEntitlements,
    };

    // Update the customer info with our mock data
    await Purchases.syncPurchases();
    logger.revenueCat.info('Pro entitlement simulated successfully');
    return mockCustomerInfo;
  } catch (error) {
    logger.revenueCat.error('Failed to simulate pro entitlement:', error);
    throw error;
  }
};

export const getProPaywall = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || null;
  } catch (error) {
    logger.revenueCat.error('Error fetching pro paywall:', error);
    return null;
  }
};

export const getMessagePackPaywall = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages || null;
  } catch (error) {
    logger.revenueCat.error('Error fetching message pack paywall:', error);
    return null;
  }
};

export const handlePurchase = async (productId: string) => {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      pkg => pkg.product.identifier === productId,
    );
    if (!pkg) {
      return false;
    }
    const {customerInfo} = await Purchases.purchasePackage(pkg);

    // Check if the purchase was successful
    if (customerInfo.entitlements.active['pro_access']) {
      // Update user plan to PRO
      const {user, setUser} = useStore();
      await updateUserPlan(user.id, SubscriptionTier.PRO);
      setUser({
        ...user,
        plan: SubscriptionTier.PRO,
        getDailyMessageLimit: () => Infinity, // Unlimited messages for PRO
      });
      return true;
    } else if (productId === 'com.ninjadating.charmr.MessagePack') {
      // Update message balance
      const {user, setUser} = useStore();
      const response = await fetch(
        `${config.apiBaseUrl}/api/users/${user.id}/extra-messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Bypass': 'true', // For development only
          },
          body: JSON.stringify({count: 50}),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to update message balance');
      }

      setUser({
        ...user,
        extraMessages: (user.extraMessages || 0) + 50, // Add 50 messages for the pack
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.revenueCat.error('Error making purchase:', error);
    return false;
  }
};

export const getSubscriptions = async () => {
  try {
    const response = await axiosInstance.get('/api/subscriptions');
    return response.data;
  } catch (error) {
    logger.app.error('Failed to get subscriptions:', error);
    throw error;
  }
};

export const updateSubscription = async (subscriptionId: string, data: any) => {
  try {
    const response = await axiosInstance.put(
      `/api/subscriptions/${subscriptionId}`,
      data,
    );
    return response.data;
  } catch (error) {
    logger.app.error('Failed to update subscription:', error);
    throw error;
  }
};
