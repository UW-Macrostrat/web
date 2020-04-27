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

let babelLoader = {
  loader: 'babel-loader',
  options: {
    sourceMap: mode == 'development'
  }
}

const cssModuleLoader = {
  loader: 'css-loader',
  options: {
    modules: {
      mode: 'global',
      localIdentName: '[path][name]__[local]--[hash:base64:5]',
    }
  }
}

let exclude = /node_modules/

module.exports = {
  mode: mode,
  module: {
    rules: [
      {test: /\.(js|jsx|ts|tsx)$/, use: [babelLoader], exclude},
      {test: /\.styl$/, use: ["style-loader", cssModuleLoader, "stylus-loader"], exclude},
      {test: /\.css$/, use: ["style-loader", cssModuleLoader], exclude},
      {test: /\.css$/, use: ["style-loader", 'css-loader']},
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
    extensions: [".ts", ".tsx", ".js", ".jsx"]
  },
  entry: {
    'js/bundle': "./src/js/index.tsx"
  },
  output: {
    path: path.join(__dirname,'/dist/'),
    filename: "[name].js"
  },
  plugins: [browserSync]
}
