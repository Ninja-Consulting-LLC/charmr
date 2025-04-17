import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {FAB, Text} from 'react-native-paper';
import DevMenu from '../components/DevMenu';
import KeyboardModal from '../components/KeyboardModal';

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">You're in!</Text>
      <DevMenu />
      <KeyboardModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
      />
      <FAB
        icon="magic-staff"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
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
