import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {useStoreState} from '../hooks/useStoreState';
import * as matchService from '../services/matchService';
import * as userService from '../services/userService';
import {SubscriptionTier} from '../types/enums';
import {User} from '../types/user';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';

interface StoreContextType {
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
  user: any;
  setUser: (user: any) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  updateUserPlan: (plan: SubscriptionTier) => Promise<void>;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  createNewUser: () => Promise<User>;
  linkAnonymousUser: (registeredUserId: string) => Promise<void>;
  handleGoogleLogin: (firebaseUser: any) => Promise<void>;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (match: Match) => void;
  removeMatch: (matchId: string) => void;
  loadMatches: () => Promise<void>;
  // Dating Coach state
  isDatingCoachEnabled: boolean;
  setIsDatingCoachEnabled: (enabled: boolean) => void;
  selectedMatch: Match | null;
  setSelectedMatch: (match: Match | null) => void;
  deleteScreenshots: boolean;
  setDeleteScreenshots: (value: boolean) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
}

export const StoreContext = createContext<StoreContextType>(
  {} as StoreContextType,
);

// Add store instance for use outside of React components
let storeInstance: StoreContextType | null = null;

// Add useStore hook
export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  storeInstance = context;
  return context;
};

// Function to get store instance outside of React components
export const getStore = () => {
  if (!storeInstance) {
    throw new Error('Store not initialized');
  }
  return storeInstance;
};

export const StoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [skipRateLimiting, setSkipRateLimiting] = useState(false);
  const [authBypass, setAuthBypass] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  // Dating Coach state
  const [isDatingCoachEnabled, setIsDatingCoachEnabled] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);
  const [prompt, setPrompt] = useState('');

  const {
    userId,
    setUserId,
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    isLoading,
    setIsLoading,
    handleGoogleLogin,
  } = useStoreState(true); // Skip initialization in useStoreState

  // Load dating coach preference on mount
  useEffect(() => {
    const loadDatingCoachPreference = async () => {
      try {
        const enabled = await AsyncStorage.getItem(
          '@charmr/dating_coach_enabled',
        );
        setIsDatingCoachEnabled(enabled === 'true');
      } catch (error) {
        console.error('Error loading dating coach preference:', error);
      }
    };
    loadDatingCoachPreference();
  }, []);

  // Save dating coach preference when changed
  useEffect(() => {
    const saveDatingCoachPreference = async () => {
      try {
        await AsyncStorage.setItem(
          '@charmr/dating_coach_enabled',
          isDatingCoachEnabled.toString(),
        );
      } catch (error) {
        console.error('Error saving dating coach preference:', error);
      }
    };
    saveDatingCoachPreference();
  }, [isDatingCoachEnabled]);

  // Set auth bypass in development mode
  useEffect(() => {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      setAuthBypass(true);
    }
  }, []);

  // Initialize app state
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.app.info('🚀 Starting app initialization...');

        // Check authentication state
        const storedIsAuthenticated = await AsyncStorage.getItem(
          'isAuthenticated',
        );
        const storedUserId = await AsyncStorage.getItem('userId');

        logger.app.info('🔍 Checking authentication state:');
        logger.app.info('  - Stored isAuthenticated:', storedIsAuthenticated);
        logger.app.info('  - Stored userId:', storedUserId);

        if (storedUserId && storedIsAuthenticated === 'true') {
          setUserId(storedUserId);
          setIsAuthenticated(true);
          logger.app.info('✅ User is authenticated');
        } else {
          logger.app.info('❌ User is not authenticated');
        }

        setIsLoading(false);
      } catch (error) {
        logger.app.error('❌ Error initializing app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const updateUserPlan = async (plan: SubscriptionTier) => {
    try {
      if (!userId) {
        throw new Error('No user ID available');
      }
      await userService.updateUserPlan(userId, plan);
      setUser({
        plan,
        getDailyMessageLimit: () => getPlanLimits(plan),
      });
      logger.app.info('User Plan Updated', {
        event: 'update_user_plan',
        userId,
        plan,
      });
    } catch (error) {
      logger.app.error('User Plan Update Error', {
        event: 'update_user_plan_error',
        userId,
        plan,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  // Load matches when user ID changes
  useEffect(() => {
    if (userId) {
      loadMatches();
    }
  }, [userId]);

  const loadMatches = async () => {
    try {
      if (!userId) {
        logger.match.debug('No user ID available, skipping match load');
        return;
      }

      const loadedMatches = await matchService.loadMatches(true);
      setMatches(loadedMatches);
      logger.app.info('Matches Loaded', {
        event: 'load_matches',
        userId,
        matchCount: loadedMatches.length,
      });
    } catch (error) {
      logger.app.error('Load Matches Error', {
        event: 'load_matches_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  const addMatch = async (match: Match) => {
    try {
      const newMatch = await matchService.addMatch(match);
      setMatches(prevMatches => [...prevMatches, newMatch]);
      logger.app.info('Match Added', {
        event: 'add_match',
        matchId: newMatch.id,
        userId,
      });
    } catch (error) {
      logger.app.error('Add Match Error', {
        event: 'add_match_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const updateMatch = async (updatedMatch: Match) => {
    try {
      const match = await matchService.updateMatch(updatedMatch);
      setMatches(prevMatches =>
        prevMatches.map(m => (m.id === match.id ? match : m)),
      );
      logger.app.info('Match Updated', {
        event: 'update_match',
        matchId: match.id,
        userId,
      });
    } catch (error) {
      logger.app.error('Update Match Error', {
        event: 'update_match_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const removeMatch = async (matchId: string) => {
    try {
      const success = await matchService.deleteMatch(matchId);
      if (success) {
        setMatches(prevMatches => prevMatches.filter(m => m.id !== matchId));
        logger.app.info('Match Removed', {
          event: 'remove_match',
          matchId,
          userId,
        });
      }
    } catch (error) {
      logger.app.error('Remove Match Error', {
        event: 'remove_match_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const createNewUser = async () => {
    try {
      const newUser = await userService.createAnonymousUser();
      setUser(newUser);
      setUserId(newUser.id);
      await AsyncStorage.setItem('userId', newUser.id);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
      return newUser;
    } catch (error) {
      logger.app.error('Error creating new user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };

  const linkAnonymousUser = async (registeredUserId: string) => {
    try {
      if (!userId) {
        throw new Error('No anonymous user ID available');
      }

      await userService.linkAnonymousUser(userId, registeredUserId);

      // Update local state
      setUserId(registeredUserId);
      await AsyncStorage.setItem('userId', registeredUserId);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');

      logger.app.info('Anonymous User Linked', {
        event: 'link_anonymous_user',
        oldUserId: userId,
        newUserId: registeredUserId,
      });
    } catch (error) {
      logger.app.error('Link Anonymous User Error', {
        event: 'link_anonymous_user_error',
        oldUserId: userId,
        newUserId: registeredUserId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      showKeyboardModal,
      setShowKeyboardModal,
      userId,
      setUserId,
      showDevMenu,
      setShowDevMenu,
      skipRateLimiting,
      setSkipRateLimiting,
      authBypass,
      setAuthBypass,
      user,
      setUser,
      isAuthenticated,
      setIsAuthenticated,
      isLoading,
      setIsLoading,
      updateUserPlan,
      showUpgradeModal,
      setShowUpgradeModal,
      createNewUser,
      linkAnonymousUser,
      handleGoogleLogin,
      matches,
      setMatches,
      addMatch,
      updateMatch,
      removeMatch,
      loadMatches,
      isDatingCoachEnabled,
      setIsDatingCoachEnabled,
      selectedMatch,
      setSelectedMatch,
      deleteScreenshots,
      setDeleteScreenshots,
      prompt,
      setPrompt,
    }),
    [
      showKeyboardModal,
      userId,
      showDevMenu,
      skipRateLimiting,
      authBypass,
      user,
      isAuthenticated,
      isLoading,
      showUpgradeModal,
      matches,
      isDatingCoachEnabled,
      selectedMatch,
      deleteScreenshots,
      prompt,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
