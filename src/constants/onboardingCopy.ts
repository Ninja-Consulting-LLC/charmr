import {Platform} from 'react-native';

export const ONBOARDING_STEP_COUNT = 3;

export type OnboardingStepConfig = {
  title: string;
  description: string;
  bullets: string[];
  /** Shown above the GIF in the help sheet */
  helpTitle: string;
  /** Step 1: deep link to system settings */
  showOpenSettings: boolean;
};

function step1IOS(): OnboardingStepConfig {
  return {
    title: 'Set up the Charmr keyboard',
    description:
      'Charmr works from your keyboard like any language keyboard. Add it once in Settings. After that you can use it in dating apps, texts, and more.',
    bullets: [
      'Open Settings',
      'Tap General',
      'Tap Keyboard',
      'Tap Keyboards',
      'Tap Add New Keyboard',
      'Choose Charmr, then allow Full Access if asked',
    ],
    helpTitle: 'How to add the keyboard',
    showOpenSettings: true,
  };
}

function step1Android(): OnboardingStepConfig {
  return {
    title: 'Set up the Charmr keyboard',
    description:
      'Charmr works from your keyboard. Turn it on in Settings. The exact menu names may look a little different on your phone.',
    bullets: [
      'Open Settings',
      'Tap System (or Additional settings on some phones)',
      'Tap Languages & input',
      'Tap On-screen keyboard or Virtual keyboard',
      'Tap Manage on-screen keyboards',
      'Turn on Charmr',
    ],
    helpTitle: 'How to turn on the keyboard',
    showOpenSettings: true,
  };
}

function step2IOS(): OnboardingStepConfig {
  return {
    title: 'Pick Charmr when you type',
    description:
      'When you are ready to reply to someone, switch to the Charmr keyboard. You can switch back anytime.',
    bullets: [
      'Open any app and tap where you would type a message',
      'When the keyboard appears, tap the globe icon on the bottom left',
      'Choose Charmr from the list',
      'Tap the globe again anytime to use a different keyboard',
    ],
    helpTitle: 'How to switch to Charmr',
    showOpenSettings: false,
  };
}

function step2Android(): OnboardingStepConfig {
  return {
    title: 'Pick Charmr when you type',
    description:
      'When you are ready to reply, switch to the Charmr keyboard. You can switch back anytime.',
    bullets: [
      'Open any app and tap where you would type a message',
      'When the keyboard appears, look for a globe or keyboard icon',
      'Tap it, then choose Charmr',
      'Use that icon again anytime to change keyboards',
    ],
    helpTitle: 'How to switch to Charmr',
    showOpenSettings: false,
  };
}

function step3(): OnboardingStepConfig {
  return {
    title: 'Sign in to save your progress',
    description: 'An account lets you:',
    bullets: [
      'Save your matches in one list',
      'Keep your coach chats tied to each person',
      'Sign in again if you get a new phone',
    ],
    helpTitle: '',
    showOpenSettings: false,
  };
}

export function getOnboardingStepConfig(step: number): OnboardingStepConfig {
  const isIOS = Platform.OS === 'ios';
  switch (step) {
    case 1:
      return isIOS ? step1IOS() : step1Android();
    case 2:
      return isIOS ? step2IOS() : step2Android();
    case 3:
      return step3();
    default:
      return step1IOS();
  }
}
