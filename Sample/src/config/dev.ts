import { getExploreName } from '../utils/platform';

export const devConfig = {
  sdkKey: 'Mvlnh6UsxhD79MJXjp6QR9vnkA6eMePsAz94',
  sdkSecret: 'YNt9F3FlTe13taA6ZovefXttMQhRLAH1Bwu3',
  topic: 'jack',
  name: `${getExploreName()}-${Math.floor(Math.random() * 1000)}`,
  password: 'jack',
  signature: '',
};
