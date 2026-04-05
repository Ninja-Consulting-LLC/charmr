import {SubscriptionTier} from './enums';

export const getPlanLimits = (plan: SubscriptionTier): number => {
  switch (plan) {
    case SubscriptionTier.PRO:
      return Infinity;
    case SubscriptionTier.FREE:
    default:
      return 5;
  }
};
