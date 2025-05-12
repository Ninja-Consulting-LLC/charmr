import AsyncStorage from '@react-native-async-storage/async-storage';
import installations from '@react-native-firebase/installations';
import {AxiosError} from 'axios';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {useStoreState} from '../hooks/useStoreState';
import * as userService from '../services/userService';
import {SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import {getMatches, Match} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import {
  checkBackendVersion,
  cleanupStaleData,
  defaultStore,
  Store,
} from './store';

// Create context with default value
const StoreContext = createContext<Store>(defaultStore);

// Custom hook to use the store
export const useStore = () => useContext(StoreContext);

// Provider component
export const StoreProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [skipRateLimiting, setSkipRateLimiting] = useState(false);
  const [authBypass, setAuthBypass] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);

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
  } = useStoreState();

  // Set auth bypass in development mode
  useEffect(() => {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      setAuthBypass(true);
    }
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
    } catch (error) {
      logger.app.error('Error updating user plan:', error);
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
      const loadedMatches = await getMatches(true);
      setMatches(loadedMatches);
    } catch (error) {
      logger.app.error('Error loading matches:', error);
    }
  };

  const addMatch = (match: Match) => {
    setMatches(prevMatches => [...prevMatches, match]);
  };

  const updateMatch = (updatedMatch: Match) => {
    setMatches(prevMatches =>
      prevMatches.map(match =>
        match.id === updatedMatch.id ? updatedMatch : match,
      ),
    );
  };

  const removeMatch = (matchId: number) => {
    setMatches(prevMatches =>
      prevMatches.filter(match => match.id !== matchId),
    );
  };

  // Get or create user ID and load user data on component mount
  useEffect(() => {
    const initUser = async () => {
      try {
        // First check backend version
        await checkBackendVersion();

        // Get stored user ID if it exists
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          try {
            // Verify user exists in backend and sync data
            const userData = await userService.fetchUserData(storedUserId);
            if (userData) {
              setUserId(storedUserId);
              setUser({
                ...userData,
                getDailyMessageLimit: () => getPlanLimits(userData.plan),
              });
              return;
            }
          } catch (error) {
            // Only log if it's not a 404 error (which is expected when user doesn't exist)
            const axiosError = error as AxiosError;
            if (axiosError.response?.status !== 404) {
              logger.app.warn(
                'Error fetching stored user:',
                axiosError.message || 'Unknown error',
              );
            }
            await cleanupStaleData();
          }
        }

        // If we get here, either no stored user or user doesn't exist in backend
        await createNewUser();
      } catch (error) {
        // Only log unexpected errors
        const axiosError = error as AxiosError;
        if (axiosError.response?.status !== 404) {
          logger.app.error(
            'Unexpected error during user initialization:',
            axiosError.message || 'Unknown error',
          );
        }
        // If initialization fails, clean up and try again
        await cleanupStaleData();
        await createNewUser();
      }
    };

    initUser();
  }, []);

  const createNewUser = async () => {
    try {
      setIsLoading(true);
      logger.app.info('👤 Starting new user creation...');

      // First check if we have a stored user ID
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        // Try to fetch the stored user
        try {
          const existingUser = await userService.fetchUserData(storedUserId);
          if (existingUser) {
            logger.app.info('👤 Found existing user:', existingUser.id);
            setUserId(storedUserId);
            setUser(existingUser);
            setIsAuthenticated(true);
            await AsyncStorage.setItem('isAuthenticated', 'true');
            setIsLoading(false);
            return;
          }
        } catch (error) {
          logger.app.info(
            '❌ Error fetching stored user, creating new one:',
            error,
          );
        }
      }

      // Check if we have an existing user with this installation ID
      let installationId;
      try {
        installationId = await installations().getId();
        const existingUser = await userService.findUserByInstallationId(
          installationId,
        );
        if (existingUser) {
          logger.app.info('👤 Found user by installation ID:', existingUser.id);
          setUserId(existingUser.id);
          await AsyncStorage.setItem('userId', existingUser.id);
          setUser(existingUser);
          setIsAuthenticated(true);
          await AsyncStorage.setItem('isAuthenticated', 'true');
          setIsLoading(false);
          return;
        }
      } catch (error) {
        logger.app.error('❌ Error getting installation ID:', error);
        // Continue without installation ID
      }

      // Create new user
      logger.app.info('👤 Creating new anonymous user...');
      const newUserId = `user-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      setUserId(newUserId);
      await AsyncStorage.setItem('userId', newUserId);

      // Create user in backend
      const newUser = await userService.createUser({
        id: newUserId,
        email: `${newUserId}@example.com`,
        name: `User ${newUserId}`,
      });

      // Ensure the user plan is set to FREE
      setUser({
        ...newUser,
        plan: SubscriptionTier.FREE,
        getDailyMessageLimit: () => getPlanLimits(SubscriptionTier.FREE),
      });

      // Set authentication state for anonymous user
      setIsAuthenticated(true);
      await AsyncStorage.setItem('isAuthenticated', 'true');
      logger.app.info(
        '✅ Successfully created and authenticated new anonymous user',
      );

      setIsLoading(false);
    } catch (error) {
      logger.app.error('❌ Error creating user:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const linkAnonymousUser = async (registeredUserId: string) => {
    try {
      if (!userId) {
        throw new Error('No anonymous user ID available');
      }

      // Get the installation ID
      const installationId = await installations().getId();

      // Link the users
      await userService.linkUsers(userId, registeredUserId);

      // Update the frontend to use the new user ID
      setUserId(registeredUserId);
      await AsyncStorage.setItem('userId', registeredUserId);

      // Fetch the updated user data
      const userData = await userService.fetchUserData(registeredUserId);
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      logger.app.error('Error linking users:', error);
      throw error;
    }
  };

  const value = {
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
    // Match management
    matches,
    setMatches,
    addMatch,
    updateMatch,
    removeMatch,
    loadMatches,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
};
