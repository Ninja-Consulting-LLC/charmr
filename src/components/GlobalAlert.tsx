import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText, tokens} from '../design-system';
import RemoteConfigService from '../services/remoteConfig';
import {logger} from '../utils/logger';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const GlobalAlert: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConfigAndUpdate = async () => {
    const remoteConfig = RemoteConfigService.getInstance();
    await remoteConfig.initialize();
    const enabled = remoteConfig.getGlobalAlertEnabled();
    const alertText = remoteConfig.getGlobalAlertText();
    setIsVisible(enabled);
    setMessage(alertText);
    logger.app.debug('[GlobalAlert] Auto-refreshed config:', {
      enabled,
      alertText,
    });
  };

  useEffect(() => {
    fetchConfigAndUpdate();

    intervalRef.current = setInterval(() => {
      fetchConfigAndUpdate();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && message) {
      logger.app.debug('[GlobalAlert] Alert shown:', message);
    } else {
      logger.app.debug('[GlobalAlert] Alert hidden');
    }
  }, [isVisible, message]);

  if (!isVisible || !message) {
    return null;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <AppText variant="label" color="hero" style={styles.message}>
          {message}
        </AppText>
        <Pressable
          style={({pressed}) => [styles.closeButton, pressed && {opacity: 0.7}]}
          onPress={() => setIsVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss alert">
          <AppText variant="title" color="hero" style={styles.closeButtonText}>
            ×
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  container: {
    backgroundColor: tokens.color.semantic.danger,
    padding: tokens.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    flex: 1,
    marginRight: tokens.space.sm,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontWeight: '700',
    lineHeight: 28,
  },
});

export default GlobalAlert;
