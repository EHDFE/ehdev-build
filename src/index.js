const chalk = require('chalk');

const pkg = require('../package.json');

module.exports = {

  command: 'init <type>',

  description: pkg.description,

  options: [
    [ '-c, --config', 'generate config only' ]
  ],

  action(type, command) {
  },
};