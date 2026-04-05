import React from 'react';
import {Image, View} from 'react-native';
import {IconButton, Text} from 'react-native-paper';
import {theme} from '../theme/theme';

interface HeaderProps {
  onUserMenuPress: () => void;
  onDevMenuPress?: () => void;
  showDevMenu?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onUserMenuPress,
  onDevMenuPress,
  showDevMenu,
}) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outline,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Image
          source={require('../../assets/logo.png')}
          style={{width: 50, height: 50}}
          resizeMode="contain"
        />
        <Text variant="headlineSmall" style={{color: theme.colors.surface}}>
          Charmr
        </Text>
      </View>
      <View style={{flexDirection: 'row'}}>
        <IconButton
          testID="user-menu-button"
          accessibilityLabel="Open account menu"
          icon="account-circle"
          size={24}
          onPress={onUserMenuPress}
          iconColor={theme.colors.secondary}
        />
        {__DEV__ && showDevMenu && (
          <IconButton
            testID="dev-menu-button"
            accessibilityLabel="Open development menu"
            icon="cog"
            size={24}
            onPress={onDevMenuPress}
            iconColor={theme.colors.secondary}
          />
        )}
      </View>
    </View>
  );
};

export default Header;
