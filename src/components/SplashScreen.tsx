import React, {useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, View, useWindowDimensions} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {AppText, Screen, tokens} from '../design-system';

export const SplashScreen = () => {
  const {width, height} = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const logoW = width * 0.6;
  const logoH = Math.min(height * 0.2, 160);

  return (
    <Screen safe={false} backgroundColor="transparent">
      <View style={styles.container}>
        <LinearGradient
          colors={[tokens.color.brand.primary, tokens.color.brand.primaryStrong]}
          style={styles.gradientBackground}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
        />
        <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
          <Image
            source={require('../../assets/logo.png')}
            style={[styles.logo, {width: logoW, height: logoH}]}
            resizeMode="contain"
          />
          <AppText variant="display" color="hero">
            Charmr
          </AppText>
        </Animated.View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    gap: tokens.space.md,
  },
  logo: {
    marginBottom: tokens.space.sm,
  },
});
