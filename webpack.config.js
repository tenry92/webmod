const path = require('path');

module.exports = {
  entry: './src/webmod.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: 'webmod.js',
    library: 'webmod',
    libraryTarget: 'this',
    path: path.resolve(__dirname, 'dist')
  }
};
