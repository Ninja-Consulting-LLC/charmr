import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useRef} from 'react';
import {View} from 'react-native';
import Header from '../components/Header';
import ResponseGenerator from '../components/ResponseGenerator';
import {RootStackParamList} from '../navigation/types';
import {theme} from '../theme/theme';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const responseGeneratorRef = useRef<{loadMatches: () => Promise<void>}>(null);

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.primary}}>
      <View style={{flex: 1}}>
        <Header onUserMenuPress={() => {}} showDevMenu={false} />
        <ResponseGenerator ref={responseGeneratorRef} navigation={navigation} />
      </View>
    </View>
  );
};

export default HomeScreen;
