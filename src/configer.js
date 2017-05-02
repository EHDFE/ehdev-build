const ehdevConfigs = require('ehdev-configs');
const ehdevConfigsLegacy = require('ehdev-configs-legacy');

module.exports = (type, options, projectConfig) => {
  let configer = projectConfig.supportIE8 ? ehdevConfigsLegacy[type] : ehdevConfigs[type];
  let config;
  if (!configer) {
    configer = ehdevConfigs['standard'];
  }
  config = configer('production', options);
  return config;
};