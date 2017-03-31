const chalk = require('chalk');

const pkg = require('../package.json');
const builder = require('./builder');

module.exports = {

  command: 'build',

  description: pkg.description,

  options: [
  ],

  action(type, command) {
    builder.run();
  },
};