import {Platform} from 'react-native';
import {getOnboardingStepConfig, ONBOARDING_STEP_COUNT} from '../onboardingCopy';

describe('onboardingCopy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exports step count', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(3);
  });

  it('step 1 differs by platform', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const ios = getOnboardingStepConfig(1);
    expect(ios.title).toContain('keyboard');
    expect(ios.showOpenSettings).toBe(true);

    jest.replaceProperty(Platform, 'OS', 'android');
    const android = getOnboardingStepConfig(1);
    expect(android.bullets.length).toBeGreaterThan(0);
  });

  it('step 3 is platform-agnostic', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const s3 = getOnboardingStepConfig(3);
    expect(s3.title).toContain('Sign in');
  });

  it('defaults unknown step to step 1 shape', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const fallback = getOnboardingStepConfig(99);
    expect(fallback.title).toBe(getOnboardingStepConfig(1).title);
  });
});
