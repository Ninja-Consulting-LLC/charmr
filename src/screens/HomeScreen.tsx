import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {FAB, IconButton, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import DevMenu from '../components/DevMenu';
import KeyboardModal from '../components/KeyboardModal';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const {showKeyboardModal, setShowKeyboardModal, setShowDevMenu} = useStore();

  console.log('HomeScreen render with modalVisible:', showKeyboardModal);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium">You're in!</Text>
          {__DEV__ && (
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowDevMenu(true)}
              style={styles.settingsButton}
            />
          )}
        </View>
        <DevMenu />
        <KeyboardModal
          visible={showKeyboardModal}
          onDismiss={() => {
            console.log('Modal dismissed');
            setShowKeyboardModal(false);
          }}
        />
        <FAB
          icon="magic-staff"
          style={styles.fab}
          onPress={() => {
            console.log('FAB pressed, showing modal');
            setShowKeyboardModal(true);
          }}
          label="Magic Keyboard"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButton: {
    margin: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    left: 0,
    bottom: 0,
  },
});

export default HomeScreen;
