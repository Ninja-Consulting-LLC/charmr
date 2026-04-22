import React from 'react';
import {Image} from 'react-native';
import {AppText, TopBar} from '../design-system';

const Header: React.FC = () => {
  return (
    <TopBar
      layout="titleStart"
      leading={
        <>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <AppText variant="titleSm" color="hero">
            Charmr
          </AppText>
        </>
      }
    />
  );
};

const styles = {
  logo: {
    width: 50,
    height: 50,
  },
};

export default Header;
