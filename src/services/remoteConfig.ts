import remoteConfig from '@react-native-firebase/remote-config';
import {logger} from '../utils/logger';

// Default values for Remote Config
const DEFAULT_VALUES = {
  global_alert_enabled: false,
  global_alert_text: '',
};

// Minimum fetch interval in milliseconds (1 hour)
const MINIMUM_FETCH_INTERVAL = 0;
// const MINIMUM_FETCH_INTERVAL = 3600000;

class RemoteConfigService {
  private static instance: RemoteConfigService;
  private config: typeof DEFAULT_VALUES;

  private constructor() {
    this.config = {...DEFAULT_VALUES};
  }

  public static getInstance(): RemoteConfigService {
    if (!RemoteConfigService.instance) {
      RemoteConfigService.instance = new RemoteConfigService();
    }
    return RemoteConfigService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      logger.app.debug('Initializing Remote Config...');

      // Set minimum fetch interval
      await remoteConfig().setConfigSettings({
        minimumFetchIntervalMillis: MINIMUM_FETCH_INTERVAL,
      });

      // Set default values
      await remoteConfig().setDefaults(DEFAULT_VALUES);

      // Fetch and activate
      const activated = await this.fetchAndActivate();
      logger.app.debug('Remote Config initialized:', {
        activated,
        config: this.config,
      });
    } catch (error) {
      logger.app.error('Failed to initialize Remote Config:', error);
      // Fallback to default values
      this.config = {...DEFAULT_VALUES};
    }
  }

  public async fetchAndActivate(): Promise<boolean> {
    try {
      const activated = await remoteConfig().fetchAndActivate();
      if (activated) {
        this.updateConfig();
        logger.app.debug('Remote Config fetched and activated:', {
          config: this.config,
        });
      }
      return activated;
    } catch (error) {
      logger.app.error('Failed to fetch and activate Remote Config:', error);
      return false;
    }
  }

  private updateConfig(): void {
    this.config = {
      global_alert_enabled: remoteConfig()
        .getValue('global_alert_enabled')
        .asBoolean(),
      global_alert_text: remoteConfig()
        .getValue('global_alert_text')
        .asString(),
    };
    logger.app.debug('Remote Config updated:', {
      config: this.config,
    });
  }

  public getGlobalAlertEnabled(): boolean {
    return this.config.global_alert_enabled;
  }

  public getGlobalAlertText(): string {
    return this.config.global_alert_text;
  }
}

export default RemoteConfigService;
