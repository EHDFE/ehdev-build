const chalk = require('chalk');

exports.buildFail = (msg) => {
  console.error(chalk.red('\n' + chalk.bold('Webpack Build Failed.') + '\n' + msg));
  process.exit(1);
};