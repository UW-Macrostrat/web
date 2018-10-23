const path = require('path')
const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
//UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const historyApiFallback = require('connect-history-api-fallback')

let mode = 'development'

let browserSync = new BrowserSyncPlugin({
  server: { baseDir: './' },
  middleware: [ historyApiFallback() ]
})

//uglify = new UglifyJsPlugin()

let plugins = [browserSync]//, uglify]

let babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: ['@babel/preset-env','@babel/preset-react'],
    sourceMap: mode == 'development'
  }
}

let exclude = /node_modules/

let coffeeLoader = {
  loader: 'coffee-loader',
  options: {sourceMap: mode == 'development'}
}

module.exports = {
  mode: mode,
  module: {
    rules: [
      {test: /\.coffee$/, use: [babelLoader, coffeeLoader], exclude},
      {test: /\.(js|jsx)$/, use: [babelLoader], exclude},
      {test: /\.styl$/, use: ["style-loader","css-loader", "stylus-loader"]},
      {test: /\.css$/, use: ["style-loader", "css-loader"]},
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {}
          }
        ]
      },
      {
        test: /\.(png|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              useRelativePath: true,
              outputPath: 'sections/assets/',
              name: '[name].[ext]'
            }
          }
        ]
      },
    ]
  },
  resolve: {
    extensions: [".coffee", ".js"]
  },
  entry: {
    'js/bundle': "./src/js/index.js"
  },
  output: {
    path: path.join(__dirname,'/dist/'),
    filename: "[name].js"
  },
  plugins: [browserSync]
}
