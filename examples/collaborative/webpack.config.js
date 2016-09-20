const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'js', 'app.js'),
  output: {
    filename: 'public/app.bundle.js',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
        query: {
          presets: ['es2015', 'react', 'stage-0'],
        },
      },
    ],
  },
}
