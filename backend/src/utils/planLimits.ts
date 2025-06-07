import {SubscriptionTier} from '../types/enums';

export const getPlanLimits = (plan: SubscriptionTier): number => {
  switch (plan) {
    case SubscriptionTier.FREE:
      return 5;
    case SubscriptionTier.PRO:
      return Infinity;
    default:
      return 5;
  }
};
