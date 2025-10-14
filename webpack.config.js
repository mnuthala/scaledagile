const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  // Load environment variables
  const envVars = dotenv.config().parsed || {};
  const isDevelopment = argv.mode === 'development';
  
  // Convert env vars to webpack DefinePlugin format
  const envKeys = Object.keys(envVars).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(envVars[next]);
    return prev;
  }, {});

  return {
    entry: {
      main: './src/index.tsx',
      settings: './src/settings.tsx'
    },
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      publicPath: '/'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@types': path.resolve(__dirname, 'src/types'),
        '@services': path.resolve(__dirname, 'src/services')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: isDevelopment,
              compilerOptions: {
                sourceMap: isDevelopment
              }
            }
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    ['autoprefixer']
                  ]
                }
              }
            }
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]'
          }
        }
      ],
    },
    plugins: [
      // HTML plugin for main timeline view
      new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        chunks: ['main'],
        inject: 'body',
        minify: isDevelopment ? false : {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        }
      }),
      // HTML plugin for settings view
      new HtmlWebpackPlugin({
        template: './src/settings.html',
        filename: 'settings.html',
        chunks: ['settings'],
        inject: 'body',
        minify: isDevelopment ? false : {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        }
      }),
      // Copy static assets
      new CopyWebpackPlugin({
        patterns: [
          { 
            from: 'images', 
            to: 'images',
            noErrorOnMissing: true 
          },
        ],
      }),
      // Define environment variables
      new webpack.DefinePlugin({
        ...envKeys,
        'process.env': JSON.stringify(argv.mode || 'development')
      }),
      // Provide global variables
      new webpack.ProvidePlugin({
        React: 'react'
      })
    ],
    optimization: {
      minimize: !isDevelopment,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
            enforce: true
          }
        }
      }
    },
    devtool: isDevelopment ? 'source-map' : false,
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      }
    },
    performance: {
      hints: isDevelopment ? false : 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    }
  };
};