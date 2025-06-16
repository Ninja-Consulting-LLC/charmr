import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
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
      if (intervalRef.current) clearInterval(intervalRef.current);
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
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setIsVisible(false)}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
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
    backgroundColor: '#FF3B30',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default GlobalAlert;
