/**
 * Web entrypoint for Cursor Cloud preview.
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import appConfig from './app.json';

const appName = appConfig.name;

AppRegistry.registerComponent(appName, () => App);

AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
