const ehdevConfigs = require('ehdev-configs');

module.exports = (type) => {
  let config;
  switch (type) {
    case 'standard':
    default:
      config = ehdevConfigs['standard']('production');
      break;
  }
  return config;
};