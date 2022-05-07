const path = require('path');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const AssetReplacePlugin = require('./tools/plugins/AssetReplacePlugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const env = process.env.NODE_ENV || 'development';
const isDevelopment = env === 'development';
const isProduction = env === 'production';

const fromRoot = (str) => path.join(__dirname, str);
const noNulls = (array) => array.filter(Boolean);

const outpuDir = fromRoot('./dist');

module.exports = {
  mode: env,

  stats: isDevelopment ? 'minimal' : undefined,
  devtool: isProduction ? false : 'inline-cheap-module-source-map',
  watchOptions: {
    ignored: /node_modules/,
  },

  resolve: {
    plugins: [new TsconfigPathsPlugin()],
    extensions: ['.js', '.ts', '.tsx'],
  },

  entry: {
    background: fromRoot('./src/background/index.ts'),
    'content-script': fromRoot('./src/content-script/index.ts'),
    inPage: fromRoot('./src/content-script/in-page.ts'),
    ui: fromRoot('./src/ui/index.tsx'),
  },
  output: {
    path: outpuDir,
    filename: '[name].js',
    publicPath: '/',
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,

        oneOf: [
          {
            // make webpack include this file if it's not imported from entries
            sideEffects: true,
            test: /in-page\.ts$/,
            loader: 'babel-loader',
          },
          { loader: 'babel-loader' },
        ],
      },
      {
        test: /\.css$/,
        include: /node_modules/,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
        ],
      },

      {
        test: /\.module\.css$/,
        exclude: /node_modules/,
        use: [
          isProduction
            ? { loader: MiniCssExtractPlugin.loader }
            : { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              modules: {
                mode: 'local',
                localIdentName: isProduction
                  ? '[hash:base64:5]'
                  : '[name]__[local]',
              },
              sourceMap: !isProduction,
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.png$|\.jpg$|\.jpeg$|\.gif$|\.otf$|\.ttf$|\.woff$|\.eot$|\.woff2$/,
        // use: ['url-loader?limit=8192&name=[path][name].[hash].[ext]'],
        // exclude: /file-loader(\.png$|\.jpg$|\.jpeg$|\.gif)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: noNulls([
    isProduction
      ? new MiniCssExtractPlugin({ filename: 'style-[contenthash].css' })
      : null,
    isDevelopment ? new ReactRefreshWebpackPlugin() : null,
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: fromRoot('public'), to: outpuDir }],
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: fromRoot('./src/ui/popup.html'),
      chunks: ['ui'],
      filename: 'popup.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: fromRoot('./src/ui/dialog.html'),
      chunks: ['ui'],
      filename: 'dialog.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: fromRoot('./src/ui/index.html'),
      chunks: ['ui'],
      filename: 'index.html',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: fromRoot('./src/background/background.html'),
      chunks: ['background'],
      filename: 'background.html',
    }),
    new AssetReplacePlugin({
      '#IN_PAGE_SCRIPT#': 'inPage',
    }),
  ]),
};
