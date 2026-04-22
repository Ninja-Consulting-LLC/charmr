import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Icon} from 'react-native-paper';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import DevMenu from '../components/DevMenu';
import Header from '../components/Header';
import ResponseGenerator from '../components/ResponseGenerator';
import SupportContactModal from '../components/SupportContactModal';
import UserMenuSlideout from '../components/UserMenuSlideout';
import {FooterNavItem, Screen, tokens} from '../design-system';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const {setShowDevMenu, showDevMenu} = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalMode, setSupportModalMode] = useState<
    'feedback' | 'support'
  >('support');
  const responseGeneratorRef = useRef<{
    loadMatches: () => Promise<void>;
    openCoach: () => void;
  }>(null);

  const handleMatchesUpdated = async () => {
    await responseGeneratorRef.current?.loadMatches();
  };

  const handleOpenFeedback = () => {
    setSupportModalMode('feedback');
    setShowSupportModal(true);
  };

  const handleOpenCoach = () => {
    responseGeneratorRef.current?.openCoach();
  };

  const mint = tokens.color.accent.mint;

  return (
    <>
      <Screen safe={false}>
        <View style={styles.root}>
          <LinearGradient
            colors={[tokens.color.brand.primary, tokens.color.brand.primaryStrong]}
            style={styles.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
          />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <Header />
            <ResponseGenerator
              ref={responseGeneratorRef}
              navigation={navigation}
            />
            <View
              style={[styles.footerNavShell, {paddingBottom: insets.bottom + tokens.space.xs}]}>
              <View style={styles.footerNav}>
                <FooterNavItem
                  testID="dating-coach-button"
                  icon={
                    <View style={styles.coachIconWrap}>
                      <Icon source="account-heart" size={20} color={mint} />
                    </View>
                  }
                  label="Try Coach"
                  labelColor="hero"
                  labelAccessory={<View style={styles.coachSparkDot} />}
                  onPress={handleOpenCoach}
                  style={styles.footerActionCoach}
                  accessibilityHint="Opens the dating coach chat"
                />

                <FooterNavItem
                  icon={<Icon source="message-text-outline" size={20} color={mint} />}
                  label="Feedback"
                  onPress={handleOpenFeedback}
                  testID="feedback-button"
                  accessibilityLabel="Open Feedback"
                  accessibilityHint="Share feedback or contact support"
                />

                <FooterNavItem
                  icon={<Icon source="account-circle" size={20} color={mint} />}
                  label="Account"
                  onPress={() => setShowUserMenu(true)}
                  testID="user-menu-button"
                  accessibilityLabel="Open Account Menu"
                  accessibilityHint="Open your account and settings menu"
                />

                {__DEV__ && (
                  <FooterNavItem
                    icon={<Icon source="cog" size={20} color={mint} />}
                    label="Dev"
                    onPress={() => setShowDevMenu(true)}
                    testID="dev-menu-button"
                    accessibilityLabel="Open Dev Menu"
                  />
                )}
              </View>
            </View>
            {__DEV__ && showDevMenu && <DevMenu />}
            <UserMenuSlideout
              visible={showUserMenu}
              onDismiss={() => setShowUserMenu(false)}
              onOpenSupport={() => {
                setSupportModalMode('support');
                setShowSupportModal(true);
              }}
              onMatchesUpdated={handleMatchesUpdated}
            />
          </SafeAreaView>
        </View>
      </Screen>
      <SupportContactModal
        visible={showSupportModal}
        onDismiss={() => setShowSupportModal(false)}
        mode={supportModalMode}
      />
    </>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  footerNavShell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.border.strong,
    backgroundColor: 'transparent',
  },
  footerNav: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    paddingTop: tokens.space.xs,
    paddingBottom: tokens.space.xs,
    paddingHorizontal: tokens.space.xs,
  },
  footerActionCoach: {
    marginHorizontal: tokens.space.xxs,
  },
  coachIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.color.accent.mint,
    shadowOpacity: 0.75,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },
  coachSparkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: tokens.color.accent.mint,
    shadowColor: tokens.color.accent.mint,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },
});

export default HomeScreen;
