import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useRef, useState} from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import DevMenu from '../components/DevMenu';
import Header from '../components/Header';
import ResponseGenerator from '../components/ResponseGenerator';
import SupportContactModal from '../components/SupportContactModal';
import UserMenuSlideout from '../components/UserMenuSlideout';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';
import {theme} from '../theme/theme';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {setShowDevMenu, showDevMenu} = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const responseGeneratorRef = useRef<{loadMatches: () => Promise<void>}>(null);

  const handleMatchesUpdated = () => {
    responseGeneratorRef.current?.loadMatches();
  };

  return (
    <>
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.primary}}>
        <View style={{flex: 1}}>
          <View style={{flex: 1}}>
            <Header
              onUserMenuPress={() => setShowUserMenu(true)}
              onDevMenuPress={() => setShowDevMenu(true)}
              showDevMenu={__DEV__}
            />
            <ResponseGenerator
              ref={responseGeneratorRef}
              navigation={navigation}
            />
          </View>
          {__DEV__ && showDevMenu && <DevMenu />}
          <UserMenuSlideout
            visible={showUserMenu}
            onDismiss={() => setShowUserMenu(false)}
            onOpenSupport={() => setShowSupportModal(true)}
            onMatchesUpdated={handleMatchesUpdated}
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
