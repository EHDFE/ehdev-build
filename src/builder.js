const path = require('path');

const projectConfig = require(path.resolve(process.cwd(), './abc.json'));

let instanceBuilder;
if (projectConfig.type === 'legacy') {
  instanceBuilder = require('./legacy-builder');
} else {
  instanceBuilder = require('./webpack-builder');
}

process.env.NODE_ENV = 'production';

exports.run = (options) => {
  instanceBuilder(options, projectConfig);
};