import React from 'react';
import {View} from 'react-native';
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
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outline,
      }}>
      <Text variant="headlineSmall" style={{color: theme.colors.onBackground}}>
        Charmr
      </Text>
      <View style={{flexDirection: 'row'}}>
        <IconButton
          icon="account-circle"
          size={24}
          onPress={onUserMenuPress}
          iconColor={theme.colors.secondary}
        />
        {__DEV__ && showDevMenu && (
          <IconButton
            testID="dev-menu-button"
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
