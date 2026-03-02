const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = __dirname;

const babelInclude = [
  path.resolve(appDirectory, 'index.web.js'),
  path.resolve(appDirectory, 'App.web.tsx'),
  path.resolve(appDirectory, 'src'),
  path.resolve(appDirectory, 'node_modules/react-native'),
  path.resolve(appDirectory, 'node_modules/react-native-web'),
  path.resolve(appDirectory, 'node_modules/react-native-gesture-handler'),
  path.resolve(appDirectory, 'node_modules/react-native-safe-area-context'),
  path.resolve(appDirectory, 'node_modules/react-native-screens'),
  path.resolve(appDirectory, 'node_modules/@react-navigation'),
  path.resolve(appDirectory, 'node_modules/react-native-paper'),
  path.resolve(appDirectory, 'node_modules/expo'),
  path.resolve(appDirectory, 'node_modules/expo-font'),
  path.resolve(appDirectory, 'node_modules/expo-modules-core'),
  path.resolve(appDirectory, 'node_modules/@react-native'),
  path.resolve(appDirectory, 'node_modules/@expo'),
  path.resolve(appDirectory, 'node_modules/react-native-vector-icons'),
];

module.exports = (_, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: path.resolve(appDirectory, 'index.web.js'),
    output: {
      path: path.resolve(appDirectory, 'web-dist'),
      filename: isProduction
        ? 'static/js/bundle.[contenthash].js'
        : 'bundle.js',
      publicPath: '/',
      clean: true,
    },
    devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
    resolve: {
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.json',
      ],
      alias: {
        'react-native$': 'react-native-web',
      },
      fallback: {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.[jt]sx?$/,
          include: babelInclude,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              configFile: false,
              cacheDirectory: true,
              presets: [
                [
                  'module:@react-native/babel-preset',
                  {disableImportExportTransform: true},
                ],
              ],
            },
          },
        },
        {
          test: /\.(gif|jpe?g|png|svg|webp)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(ttf|otf|woff2?)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(appDirectory, 'web/index.html'),
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(!isProduction),
        'process.env.NODE_ENV': JSON.stringify(
          isProduction ? 'production' : 'development',
        ),
      }),
    ],
    devServer: {
      host: '0.0.0.0',
      port: 8080,
      historyApiFallback: true,
      hot: true,
      allowedHosts: 'all',
    },
  };
};
