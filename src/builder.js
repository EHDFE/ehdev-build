const path = require('path');
const chalk = require('chalk');
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const { buildFail } = require('./util');
const configer = require('./configer');
const projectConfig = require(path.resolve(process.cwd(), './abc.json'));

exports.run = (options) => {

  webpackConfig = configer(projectConfig.type);

  webpackConfig.plugins.push(
    new UglifyJSPlugin(),
    new ManifestPlugin({
      fileName: 'stats.json',
    }),
    new CleanWebpackPlugin([projectConfig.build_path ? projectConfig.build_path: 'dist'], {
      root: process.cwd(),
      verbose: true,
      dry: false,
    })
  );
  if (options.analyzer) {
    webpackConfig.plugins.push(
      new BundleAnalyzerPlugin()
    );
  }

  if (projectConfig.publicPath) {
    webpackConfig.output.publicPath = projectConfig.publicPath;
  }
  
  try {
    const compiler = webpack(webpackConfig);

    compiler.run((err, stats) => {
      if (err) {
        return buildFail(err.toString());
      }
      if (stats.hasErrors()) {
        return buildFail(stats.toJson().errors[0].split('\n').slice(0, 2).join('\n'));
      }
      console.log('\n' + stats.toString({
        hash: false,
        chunks: false,
        children: false,
        colors: true,
      }));
    });
    
  } catch (e) {
    console.error(chalk.red('Error in "webpack.config.js"\n' + e.stack));
    process.exit(1);
  }
  
};