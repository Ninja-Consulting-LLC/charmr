import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';

type GradientProps = {
  colors?: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const LinearGradient: React.FC<GradientProps> = ({colors, style, children}) => {
  const backgroundColor = colors?.[0] || 'transparent';
  return <View style={[{backgroundColor}, style]}>{children}</View>;
};

export default LinearGradient;
