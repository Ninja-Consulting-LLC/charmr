import { Platform } from 'react-native';
import Config from 'react-native-config';
import Purchases, {
  CustomerInfo,
  PurchasesConfiguration
} from 'react-native-purchases';
import { SubscriptionTier } from '../types/enums';
import { User } from '../types/user';
import { logger } from '../utils/logger';
import { getPlanLimits } from '../utils/planLimits';
import axiosInstance from './axiosInstance';

// Development configuration for testing in simulator
const REVENUECAT_DEV_API_KEY = Platform.select({
  ios: Config.REVENUECAT_IOS_API_KEY,
  android: Config.REVENUECAT_ANDROID_API_KEY,
  default: '',
});

// Production configuration
const REVENUECAT_PROD_API_KEY = Platform.select({
  ios: Config.REVENUECAT_IOS_API_KEY,
  android: Config.REVENUECAT_ANDROID_API_KEY,
  default: '',
});

let subscriptionUpdateCallback: ((info: CustomerInfo) => Promise<void>) | null =
  null;

export const setSubscriptionUpdateCallback = (
  callback: (info: CustomerInfo) => Promise<void>,
) => {
  subscriptionUpdateCallback = callback;
};

export const initializeRevenueCat = async () => {
  try {
    const apiKey = __DEV__ ? REVENUECAT_DEV_API_KEY : REVENUECAT_PROD_API_KEY;
    logger.revenueCat.info('Initializing RevenueCat with API key:', {
      hasApiKey: !!apiKey,
      isDev: __DEV__,
      platform: Platform.OS,
    });

    if (!apiKey) {
      throw new Error('RevenueCat API key not found');
    }

    const purchasesConfig: PurchasesConfiguration = {
      apiKey,
    };
    await Purchases.configure(purchasesConfig);
    logger.revenueCat.info('RevenueCat configured successfully');

    // Set up subscription listener
    Purchases.addCustomerInfoUpdateListener(async info => {
      logger.revenueCat.info('RevenueCat subscription updated:', {
        entitlements: info.entitlements,
        originalAppUserId: info.originalAppUserId,
        managementURL: info.managementURL,
      });

      if (subscriptionUpdateCallback) {
        await subscriptionUpdateCallback(info);
      }
    });

    // Log initial customer info
    const customerInfo = await Purchases.getCustomerInfo();
    logger.revenueCat.info('Initial RevenueCat customer info:', {
      entitlements: customerInfo.entitlements,
      originalAppUserId: customerInfo.originalAppUserId,
      managementURL: customerInfo.managementURL,
    });

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

export const getProPaywall = async () => {
  try {
    logger.revenueCat.info('Fetching pro paywall...');
    const offerings = await Purchases.getOfferings();
    logger.revenueCat.info('RevenueCat offerings:', {
      hasCurrent: !!offerings.current,
      availablePackages: offerings.current?.availablePackages?.length || 0,
      offerings: offerings.all,
    });

    if (!offerings.current) {
      logger.revenueCat.warn('No current offering available');
      return null;
    }

    if (!offerings.current.availablePackages?.length) {
      logger.revenueCat.warn('No available packages in current offering');
      return null;
    }

    // Filter out message pack products and only return subscription products
    const subscriptionPackages = offerings.current.availablePackages.filter(
      pkg => pkg.product.productType === 'AUTO_RENEWABLE_SUBSCRIPTION',
    );

    return subscriptionPackages;
  } catch (error) {
    logger.revenueCat.error('Error fetching pro paywall:', error);
    if (error instanceof Error) {
      logger.revenueCat.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
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

export const handlePurchase = async (
  productId: string,
  user: User | null,
  setUser: (user: User | null) => void,
): Promise<boolean> => {
  try {
    console.log('[revenueCatService] handlePurchase called with', productId);
    // Get the offerings first
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      pkg => pkg.product.identifier === productId,
    );
    console.log('[revenueCatService] found package:', pkg);
    if (!pkg) {
      throw new Error(
        'This product is currently unavailable. Please try again later.',
      );
    }

    // Check if user already has an active subscription
    const customerInfo = await Purchases.getCustomerInfo();
    const hasActiveSubscription =
      customerInfo.entitlements.active['Pro']?.isActive;
    console.log(
      '[revenueCatService] hasActiveSubscription:',
      hasActiveSubscription,
    );

    // For monthly plan, prevent purchase if already subscribed
    if (
      hasActiveSubscription &&
      productId === 'com.ninjadating.charmr.Monthly'
    ) {
      throw new Error(
        'You already have an active subscription. You can manage your subscription in the app settings.',
      );
    }

    // Attempt the purchase
    console.log('[revenueCatService] purchasing package...');
    const {customerInfo: newCustomerInfo} = await Purchases.purchasePackage(
      pkg,
    );
    console.log('[revenueCatService] purchasePackage result:', newCustomerInfo);

    // Check if purchase was successful
    if (newCustomerInfo.entitlements.active['Pro']?.isActive) {
      // Update user's plan in the app
      if (user) {
        const updatedUser = {
          ...user,
          plan: SubscriptionTier.PRO,
          dailyMessageLimit: null,
        };
        setUser(updatedUser);
        console.log('[revenueCatService] purchase successful, user updated');
        return true;
      }
    }

    // If we get here, something went wrong
    throw new Error(
      'Unable to update your message balance. Please try again or contact support if the issue persists.',
    );
  } catch (error) {
    console.log('[revenueCatService] handlePurchase error:', error);
    // Check if the error is because the purchase was actually successful
    const customerInfo = await Purchases.getCustomerInfo();
    if (customerInfo.entitlements.active['Pro']?.isActive) {
      // Purchase was successful despite the error
      if (user) {
        const updatedUser = {
          ...user,
          plan: SubscriptionTier.PRO,
          dailyMessageLimit: null,
        };
        setUser(updatedUser);
        console.log(
          '[revenueCatService] purchase successful after error, user updated',
        );
        return true;
      }
    }

    // If it's a user-friendly error, throw it directly
    if (error instanceof Error) {
      throw error;
    }

    // For other errors, provide a generic message
    throw new Error('Unable to complete the purchase. Please try again later.');
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

export const syncSubscriptionState = async (
  updateUserPlan: (userId: string, plan: SubscriptionTier) => Promise<any>,
  setUser: (user: any) => void,
  currentUser: any,
  forceSync: boolean = false,
) => {
  try {
    // Only sync if forced or if user has an active subscription
    const customerInfo = await Purchases.getCustomerInfo();
    const hasProAccess = customerInfo.entitlements.active['Pro']?.isActive;

    // If not forcing sync and no active subscription, don't sync
    if (!forceSync && !hasProAccess) {
      logger.revenueCat.info('Skipping subscription sync - no active subscription');
      return null;
    }

    logger.revenueCat.info('Syncing RevenueCat state:', {
      entitlements: customerInfo.entitlements,
      originalAppUserId: customerInfo.originalAppUserId,
      managementURL: customerInfo.managementURL,
      forceSync,
    });

    if (hasProAccess) {
      if (currentUser.plan !== SubscriptionTier.PRO) {
        logger.revenueCat.info(
          'Updating user plan to PRO based on RevenueCat state',
        );
        await updateUserPlan(currentUser.id, SubscriptionTier.PRO);
        setUser({
          ...currentUser,
          plan: SubscriptionTier.PRO,
          getDailyMessageLimit: () => Infinity,
        });
      }
    } else {
      if (currentUser.plan !== SubscriptionTier.FREE) {
        logger.revenueCat.info(
          'Updating user plan to FREE based on RevenueCat state',
        );
        await updateUserPlan(currentUser.id, SubscriptionTier.FREE);
        setUser({
          ...currentUser,
          plan: SubscriptionTier.FREE,
          getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
        });
      }
    }

    return customerInfo;
  } catch (error) {
    logger.revenueCat.error('Failed to sync subscription state:', error);
    return null;
  }
};

export const cancelSubscription = async () => {
  try {
    // Get the current customer info
    const customerInfo = await Purchases.getCustomerInfo();

    logger.revenueCat.info('Checking subscription state for cancellation:', {
      entitlements: customerInfo.entitlements,
      managementURL: customerInfo.managementURL,
    });

    // Check if this is a sandbox subscription
    const proEntitlement = customerInfo.entitlements.active['Pro'];
    if (proEntitlement?.isSandbox) {
      logger.revenueCat.info('Sandbox subscription detected');
      return 'SANDBOX';
    }

    // Get the management URL from RevenueCat
    const managementURL = customerInfo.managementURL;

    if (!managementURL) {
      logger.revenueCat.warn('No management URL available');
      return null;
    }

    return managementURL;
  } catch (error) {
    logger.revenueCat.error(
      'Error getting subscription management URL:',
      error,
    );
    return null;
  }
};
