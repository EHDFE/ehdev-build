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

process.env.NODE_ENV = 'production';

exports.run = (options) => {

  webpackConfig = configer(projectConfig.type);
  const SUPPORT_IE8 = !!projectConfig.supportIE8;

  const UglifyConfig = {
    sourceMap: true,
  };
  
  if (SUPPORT_IE8) {
    Object.assign(UglifyConfig, {
      compress: {
        screw_ie8: false,
      },
      mangle: {
        screw_ie8: false,
      },
      output: {
        screw_ie8: false,
      },
    });
  }

  webpackConfig.plugins.push(
    new UglifyJSPlugin(UglifyConfig),
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