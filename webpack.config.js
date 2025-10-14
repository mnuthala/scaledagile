const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  const envVars = dotenv.config().parsed || {};
  const isDevelopment = argv.mode === 'development';
  
  return {
    entry: {
      main: './src/index.tsx',
      settings: './src/settings.tsx'
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        chunks: ['main']
      }),
      new HtmlWebpackPlugin({
        template: './src/settings.html',
        filename: 'settings.html',
        chunks: ['settings']
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'images', to: 'images', noErrorOnMissing: true },
        ],
      }),
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(envVars)
      }),
    ],
    devtool: isDevelopment ? 'source-map' : false,
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 3000,
      hot: true,
    },
  };
};