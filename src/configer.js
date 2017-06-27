const path = require('path');

const root = path.resolve(__dirname, '../../');
const ehdevConfigs = require(path.resolve(root, 'ehdev-configs'));
const ehdevConfigsLegacy = require(path.resolve(root, 'ehdev-configs-legacy'));

module.exports = (type, options, projectConfig) => {
  let configer = projectConfig.supportIE8 ? ehdevConfigsLegacy[type] : ehdevConfigs[type];
  let config;
  if (!configer) {
    configer = ehdevConfigs['standard'];
  }
  config = configer('production', options);
  return config;
};