import React from 'react';
import {StyleSheet, View, type ViewProps} from 'react-native';
import {
  SafeAreaView,
  type Edges,
} from 'react-native-safe-area-context';
import {tokens} from '../tokens';

type ScreenProps = ViewProps & {
  children: React.ReactNode;
  /** Safe-area edges; default all sides (matches prior SafeAreaView usage) */
  edges?: Edges;
  /** Background fill (token string) */
  backgroundColor?: string;
  /** When false, render plain View (no safe area) */
  safe?: boolean;
};

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  edges = ['top', 'right', 'bottom', 'left'],
  backgroundColor = tokens.color.brand.primary,
  safe = true,
  ...rest
}) => {
  const baseStyle = [styles.fill, {backgroundColor}, style];
  if (safe) {
    return (
      <SafeAreaView style={baseStyle} edges={edges} {...rest}>
        {children}
      </SafeAreaView>
    );
  }
  return (
    <View style={baseStyle} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
