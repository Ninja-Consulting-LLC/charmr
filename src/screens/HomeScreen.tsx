import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {View} from 'react-native';
import {IconButton, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import DevMenu from '../components/DevMenu';
import ResponseGenerator from '../components/ResponseGenerator';
import SupportContactModal from '../components/SupportContactModal';
import UserMenuSlideout from '../components/UserMenuSlideout';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';
import {theme} from '../theme/theme';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const {setShowDevMenu, showDevMenu} = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <>
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
        <View style={{flex: 1}}>
          <View style={{flex: 1}}>
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
              <Text
                variant="headlineSmall"
                style={{color: theme.colors.onBackground}}>
                Dating Buddy
              </Text>
              <View style={{flexDirection: 'row'}}>
                <IconButton
                  icon="account-circle"
                  size={24}
                  onPress={() => setShowUserMenu(true)}
                  iconColor={theme.colors.secondary}
                />
                {__DEV__ && (
                  <IconButton
                    testID="dev-menu-button"
                    icon="cog"
                    size={24}
                    onPress={() => setShowDevMenu(true)}
                    iconColor={theme.colors.secondary}
                  />
                )}
              </View>
            </View>
            <ResponseGenerator />
          </View>
          {__DEV__ && showDevMenu && <DevMenu />}
          <UserMenuSlideout
            visible={showUserMenu}
            onDismiss={() => setShowUserMenu(false)}
            onOpenSupport={() => setShowSupportModal(true)}
          />
        </View>
      </SafeAreaView>
      <SupportContactModal
        visible={showSupportModal}
        onDismiss={() => setShowSupportModal(false)}
      />
    </>
  );
};

export default HomeScreen;
