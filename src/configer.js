const ehdevConfigs = require('ehdev-configs');

module.exports = (type, options) => {
  let configer = ehdevConfigs[type];
  let config;
  if (!configer) {
    configer = ehdevConfigs['standard'];
  }
  config = configer('production', options);
  return config;
};