import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

export const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.text}>Charmr</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f0835',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 120,
    marginBottom: 12,
  },
  text: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
});
