import React from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {theme} from '../theme/theme';

const RippleAnimation: React.FC = () => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
  }, []);

  const rippleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.5, 1], [0.3, 0.5, 0.3]),
      transform: [
        {
          scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.5, 2]),
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ripple, rippleStyle]}>
        <View style={styles.gradient} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    marginLeft: -100,
    marginTop: -100,
    borderRadius: 100,
    backgroundColor: theme.colors.secondary,
    opacity: 0.3,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: theme.colors.secondary,
  },
});

export default RippleAnimation;
