import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {AppText} from './AppText';
import {tokens} from '../tokens';

type SectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  style,
  contentStyle,
}) => (
  <View style={[styles.section, style]}>
    {(title || description) && (
      <View style={styles.header}>
        {title ? (
          <AppText variant="label" color="hero">
            {title}
          </AppText>
        ) : null}
        {description ? (
          <AppText variant="caption" color="heroMuted" style={styles.desc}>
            {description}
          </AppText>
        ) : null}
      </View>
    )}
    <View style={contentStyle}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  header: {
    marginBottom: tokens.space.sm,
    gap: tokens.space.xs,
  },
  desc: {
    marginTop: tokens.space.xxs,
  },
});
