const warn = (message: string) => {
  console.warn(`[web-preview] ${message}`);
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
} as const;

export const GoogleSignin = {
  configure: async (_options?: any) => {
    warn('GoogleSignin.configure uses web preview shim.');
  },
  hasPlayServices: async () => true,
  signIn: async () => ({
    data: {
      idToken: 'web-preview-id-token',
    },
    user: {
      id: 'web-preview-user',
      email: 'preview@charmr.local',
      name: 'Web Preview User',
    },
  }),
  signOut: async () => undefined,
};
