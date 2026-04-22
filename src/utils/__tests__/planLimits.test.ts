import {SubscriptionTier} from '../../types/enums';
import {getPlanLimits} from '../planLimits';

describe('planLimits', () => {
  it('returns Infinity for PRO', () => {
    expect(getPlanLimits(SubscriptionTier.PRO)).toBe(Infinity);
  });

  it('returns 5 for FREE', () => {
    expect(getPlanLimits(SubscriptionTier.FREE)).toBe(5);
  });
});
