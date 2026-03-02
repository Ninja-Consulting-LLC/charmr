import { SubscriptionTier } from '../types/enums';
import { User } from '../types/user';
import { Match } from '../utils/matchUtils';

export interface StoreContextType {
  showKeyboardModal: boolean;
  setShowKeyboardModal: (show: boolean) => void;
  userId: string;
  setUserId: (userId: string) => void;
  showDevMenu: boolean;
  setShowDevMenu: (show: boolean) => void;
  skipRateLimiting: boolean;
  setSkipRateLimiting: (skip: boolean) => void;
  authBypass: boolean;
  setAuthBypass: (bypass: boolean) => void;
  user: User;
  setUser: (user: User) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  updateUserPlan: (plan: SubscriptionTier) => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  createNewUser: () => Promise<User>;
  linkAnonymousUser: (registeredUserId: string) => Promise<void>;
  handleProviderLogin: (firebaseUser: any) => Promise<void>;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (match: Match) => void;
  removeMatch: (matchId: string) => void;
  loadMatches: () => Promise<void>;
  // Dating Coach state
  selectedMatch: Match | null;
  setSelectedMatch: (match: Match | null) => void;
  deleteScreenshots: boolean;
  setDeleteScreenshots: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export interface StoreState {
  userId: string;
  setUserId: (userId: string) => void;
  user: User;
  setUser: (user: User) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}