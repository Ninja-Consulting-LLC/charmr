/**
 * Charmr design tokens — dark-first semantic palette.
 * Unmigrated screens continue using Paper's light theme; refactored surfaces use these explicitly.
 */
export const tokens = {
  space: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },

  radii: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
    /** Paper `roundness` (buttons, inputs) */
    paper: 10,
  },

  type: {
    /** Sizes (dp); used by `AppText` (system default font) */
    display: {size: 28, lineHeight: 34, weight: '700' as const},
    title: {size: 22, lineHeight: 28, weight: '600' as const},
    titleSm: {size: 18, lineHeight: 24, weight: '600' as const},
    body: {size: 16, lineHeight: 22, weight: '400' as const},
    bodyMedium: {size: 16, lineHeight: 22, weight: '500' as const},
    label: {size: 14, lineHeight: 20, weight: '500' as const},
    caption: {size: 12, lineHeight: 16, weight: '400' as const},
    overline: {size: 11, lineHeight: 14, weight: '600' as const},
  },

  color: {
    canvas: {
      /** Default app canvas (dark) */
      default: '#0B0A0F',
      elevated: '#12111A',
    },
    surface: {
      /** Cards / modals on dark canvas */
      default: '#16141F',
      muted: '#1E1C28',
      inverse: '#FAF8FF',
    },
    brand: {
      primary: '#7E22CE',
      /** Hero / modal gradient end, mid composer */
      primaryStrong: '#3B0764',
      /**
       * Deepest brand purple — composer foot, dark chrome.
       * Pair with `hero.text` / `accent.mint` for contrast; avoid `hero.textSubtle` on this alone.
       */
      primaryDeep: '#20083A',
      primarySoft: '#A855F7',
    },
    accent: {
      mint: '#40E0D0',
      /** Darker turquoise — gradient stops with `mint` for modal icon buttons */
      mintDeep: '#1FA89A',
      mintMuted: 'rgba(64, 224, 208, 0.14)',
    },
    hero: {
      /** Text / chrome on purple gradient hero */
      text: '#FFFFFF',
      textMuted: 'rgba(255, 255, 255, 0.72)',
      textSubtle: 'rgba(255, 255, 255, 0.55)',
      glass: 'rgba(255, 255, 255, 0.1)',
      glassBorder: 'rgba(255, 255, 255, 0.2)',
      scrim: 'rgba(0, 0, 0, 0.22)',
    },
    semantic: {
      danger: '#F87171',
      success: '#4ADE80',
      warning: '#FBBF24',
      info: '#93C5FD',
    },
    text: {
      primary: '#F4F2FA',
      secondary: 'rgba(244, 242, 250, 0.72)',
      tertiary: 'rgba(244, 242, 250, 0.5)',
      onAccent: '#0B0A0F',
      onInverse: '#1A1523',
      onInverseMuted: 'rgba(26, 21, 35, 0.65)',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.16)',
    },
    overlay: {
      heavy: 'rgba(0, 0, 0, 0.55)',
      scrim: 'rgba(0, 0, 0, 0.97)',
      /** Solid scrim behind purple modal sheets — deep plum (not flat black) */
      modalBackdrop: '#1C102E',
      /** Legacy tinted scrim */
      modalScrim: 'rgba(5, 2, 12, 0.94)',
    },
  },

  /** Dynamic type caps — keeps modals and chat layout stable while allowing partial scaling */
  a11y: {
    maxFontSizeMultiplier: 1.35,
  },

  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 1},
      shadowOpacity: 0.12,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    /** Tinted glow for accent controls on hero */
    accentGlow: {
      shadowColor: '#40E0D0',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 6,
    },
  },
} as const;

export type SpaceKey = keyof typeof tokens.space;
export type RadiiKey = keyof typeof tokens.radii;
