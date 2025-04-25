import {SubscriptionTier} from '../types/enums';

export const getPlanLimits = (plan: SubscriptionTier): number => {
  switch (plan) {
    case SubscriptionTier.FREE:
      return 5;
    case SubscriptionTier.PREMIUM:
      return 50;
    case SubscriptionTier.PRO:
      return 200;
    default:
      return 5;
  }
};
