import {SubscriptionTier} from '../types/enums';

export const getPlanLimits = (plan: SubscriptionTier): number => {
  switch (plan) {
    case SubscriptionTier.PRO:
      return Infinity; // Unlimited messages for PRO
    case SubscriptionTier.FREE:
    default:
      return 5; // 5 messages per day for free tier
  }
};
