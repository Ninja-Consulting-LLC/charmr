import AsyncStorage from '@react-native-async-storage/async-storage';
import installations from '@react-native-firebase/installations';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {useStoreState} from '../hooks/useStoreState';
import * as userService from '../services/userService';
import {SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import {getMatches, Match} from '../utils/matchUtils';
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
  removeMatch: (matchId: number) => void;
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

// Add useStore hook
export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
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

      const loadedMatches = await getMatches(true);
      setMatches(loadedMatches);
      logger.app.info('Matches Loaded', {
        event: 'load_matches',
        userId,
        matchCount: loadedMatches.length,
      });
    } catch (error) {
      // Don't treat empty matches as an error
      if (
        error instanceof Error &&
        error.message === 'Failed to fetch matches'
      ) {
        logger.match.debug('No matches found for user', {userId});
        setMatches([]);
        return;
      }

      logger.app.error('Load Matches Error', {
        event: 'load_matches_error',
        userId,
        error: error instanceof Error ? error.message : error,
      });
    }
  };

  const addMatch = (match: Match) => {
    setMatches(prevMatches => [...prevMatches, match]);
    logger.app.info('Match Added', {
      event: 'add_match',
      matchId: match.id,
      userId,
    });
  };

  const updateMatch = (updatedMatch: Match) => {
    setMatches(prevMatches =>
      prevMatches.map(match =>
        match.id === updatedMatch.id ? updatedMatch : match,
      ),
    );
    logger.app.info('Match Updated', {
      event: 'update_match',
      matchId: updatedMatch.id,
      userId,
    });
  };

  const removeMatch = (matchId: number) => {
    setMatches(prevMatches =>
      prevMatches.filter(match => match.id !== matchId),
    );
    logger.app.info('Match Removed', {
      event: 'remove_match',
      matchId,
      userId,
    });
  };

  const createNewUser = async () => {
    try {
      setIsLoading(true);
      let installationId;
      try {
        installationId = await installations().getId();
        logger.app.info('Installation ID Fetched', {
          event: 'get_installation_id',
          installationId,
        });
      } catch (error) {
        logger.app.error('Installation ID Error', {
          event: 'get_installation_id_error',
          error: error instanceof Error ? error.message : error,
        });
      }
      logger.app.info('Creating Anonymous User', {
        event: 'create_anonymous_user_start',
        installationId,
      });
      const newUserId = `user-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create user first
      const newUser = await userService.createUser({
        id: newUserId,
        email: `${newUserId}@example.com`,
        name: `User ${newUserId}`,
        installationId,
      });

      // Only update state after user is created
      setUserId(newUserId);
      await AsyncStorage.setItem('userId', newUserId);
      setUser({
        ...newUser,
        plan: SubscriptionTier.FREE,
        getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
      });
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');

      logger.app.info('Anonymous User Created', {
        event: 'create_anonymous_user_success',
        newUserId,
        installationId,
      });
      setIsLoading(false);
      return newUser;
    } catch (error) {
      logger.app.error('Create User Error', {
        event: 'create_anonymous_user_error',
        error: error instanceof Error ? error.message : error,
      });
      setIsLoading(false);
      throw error;
    }
  };

  const linkAnonymousUser = async (registeredUserId: string) => {
    try {
      if (!userId) {
        throw new Error('No anonymous user ID available');
      }
      const installationId = await installations().getId();
      await userService.linkUsers(userId, registeredUserId);
      setUserId(registeredUserId);
      await AsyncStorage.setItem('userId', registeredUserId);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
      logger.app.info('Anonymous User Linked', {
        event: 'link_anonymous_user',
        oldUserId: userId,
        newUserId: registeredUserId,
        installationId,
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
      // Dating Coach state
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
      // Dating Coach state
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
