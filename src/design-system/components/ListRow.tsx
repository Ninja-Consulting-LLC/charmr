import React from 'react';
import {Pressable, StyleSheet, View, type PressableProps} from 'react-native';
import {AppText} from './AppText';
import {tokens} from '../tokens';

type ListRowProps = Omit<PressableProps, 'style'> & {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: PressableProps['style'];
};

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  style,
  ...rest
}) => (
  <Pressable
    style={state => [
      styles.row,
      state.pressed && styles.pressed,
      typeof style === 'function' ? style(state) : style,
    ]}
    {...rest}>
    {leading ? <View style={styles.leading}>{leading}</View> : null}
    <View style={styles.textBlock}>
      <AppText variant="bodyMedium" color="primary">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color="secondary" style={styles.sub}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
    {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md,
  },
  pressed: {
    opacity: 0.85,
  },
  leading: {
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: tokens.space.xxs,
  },
  sub: {
    marginTop: tokens.space.xxs,
  },
  trailing: {
    justifyContent: 'center',
  },
});
