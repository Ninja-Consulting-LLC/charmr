import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import {theme} from '../theme/theme';

const TypingIndicator: React.FC = () => {
  const dots = [0, 1, 2].map(() => useSharedValue(0));

  useEffect(() => {
    dots.forEach((dot, index) => {
      dot.value = withRepeat(
        withSequence(
          withDelay(
            index * 160,
            withSpring(1, {
              damping: 8,
              stiffness: 100,
              mass: 0.5,
            }),
          ),
          withSpring(0, {
            damping: 8,
            stiffness: 100,
            mass: 0.5,
          }),
        ),
        -1,
        false,
      );
    });
  }, [dots]);

  return (
    <View style={styles.typingIndicator}>
      <View style={styles.typingBubble}>
        {dots.map((dot, index) => {
          const animatedStyle = useAnimatedStyle(() => {
            return {
              transform: [
                {
                  translateY: dot.value * -4,
                },
              ],
              opacity: 0.4 + dot.value * 0.6,
            };
          });

          return (
            <Animated.View
              key={index}
              style={[styles.typingDot, animatedStyle]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  typingIndicator: {
    padding: 8,
    marginLeft: 8,
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    width: 60,
    height: 36,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: theme.colors.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.onSurfaceVariant,
  },
});

export default TypingIndicator;
