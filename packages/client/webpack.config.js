const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const path = require('path');

module.exports = (env) => {
  const mode = env.production ? 'production' : 'development';

  return {
    mode,

    module: {
      rules: [
        {
          test: /(\.ts|\.tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        },
        {
          test: /(\.vsh|\.fsh)$/i,
          use: 'raw-loader',
        },

        // For pure CSS (without CSS modules)
        {
          test: /\.css$/i,
          exclude: /\.module\.css$/i,
          use: ['style-loader', 'css-loader'],
        },

        // For CSS modules
        {
          test: /\.module\.css$/i,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: mode === 'production' ? 'planner_[hash:base64]' : '[path][name]__[local]',
                },
              },
            },
          ],
        },
      ],
    },

    resolve: {
      extensions: ['.ts', '.js', '.tsx'],
      alias: {
        '@game/server': path.resolve(__dirname, '../server/src'),
        '@game/utils': path.resolve(__dirname, '../utils/src'),
        '@game/data': path.resolve(__dirname, '../data'),
      },
    },

    entry: './src/index.ts',

    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'dist'),
    },

    plugins: [
      new Dotenv({ path: path.resolve(__dirname, '../../.env') }),
      new ForkTsCheckerWebpackPlugin(),
      new HtmlWebpackPlugin({
        template: 'index.html',
      }),
    ],

    devtool: mode === 'production' ? false : 'source-map',

    devServer: {
      host: '0.0.0.0',
      port: 3000,
      stats: {
        modules: false,
      },
      disableHostCheck: true,
      contentBase: path.resolve(__dirname, 'dist'),
    },
  };
};
