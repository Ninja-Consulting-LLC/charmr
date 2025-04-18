import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {FAB, Text} from 'react-native-paper';
import DevMenu from '../components/DevMenu';
import KeyboardModal from '../components/KeyboardModal';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const {showKeyboardModal, setShowKeyboardModal} = useStore();

  console.log('HomeScreen render with modalVisible:', showKeyboardModal);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">You're in!</Text>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    left: 0,
    bottom: 0,
  },
});

export default HomeScreen;
