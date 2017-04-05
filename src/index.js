const chalk = require('chalk');

const pkg = require('../package.json');
const builder = require('./builder');

module.exports = {

  command: 'build',

  description: pkg.description,

  options: [
    [ '-a, --analyzer', '分析打包结果'],
  ],

  action(options) {
    builder.run(options);
  },
};