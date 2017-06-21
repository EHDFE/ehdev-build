const fs = require('fs');
const path = require('path');
const stream = require('stream');
const chalk = require('chalk');
const inquirer = require('inquirer');
const gulp = require('gulp');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const logger = require('gulp-logger');
const Rx = require('rx-lite');

const makePrompt = ({ name, message, choices }) => ({
  type: 'list',
  name,
  message,
  default: choices[0],
  choices,
  validate(input) {
    if (projectList.includes(input)) return true;
    return false;
  },
});

const cwd = process.cwd();

module.exports = (options, projectConfig) => {
  const projectList = Object.keys(projectConfig.workspace);
  const prompts = new Rx.Subject();
  
  const iq = inquirer.prompt(prompts);
  const cacheAnswer = {};
  iq.ui.process.subscribe(
    ({ name, answer }) => {
      Object.assign(cacheAnswer, {
        [name]: answer,
      });
      switch (name) {
        case 'project':
          fs.readdir(path.resolve(cwd, answer), (err, data) => {
            const subDir = data.filter(d => !d.startsWith('.'));
            prompts.onNext(makePrompt({
              name: 'branch',
              message: `Please select the ${chalk.yellow('directory')} or branch to compile`,
              choices: subDir,
            }));
          });
          break;
        case 'branch':
          const confirmDirectory = path.resolve(cwd, `${cacheAnswer.project}/${cacheAnswer.branch}`);
          prompts.onNext({
            type: 'confirm',
            name: 'directory',
            message: `Is this the exactly ${chalk.yellow('directory')} (${chalk.green(confirmDirectory)}) you wanna to compile`,
            default: false,
          });
          break;
        case 'directory':
          prompts.onCompleted();
          break;
        default:
          prompts.onCompleted();
          break;
      }
    },
    (err) => {
      console.log(chalk.red(err));
    }
  );

  prompts.onNext(makePrompt({
    name: 'project',
    message: 'Please select the project to compile',
    choices: projectList,
  }));

  iq.then(answers => {
    if (answers.directory) {
      const rootPath = `${answers.project}/${answers.branch}`;
      
      gulp.src([
        `${rootPath}/**/*`,
        `!${rootPath}/**/*.js`,
        `!${rootPath}/**/*.css`,
        `!${rootPath}/dist/**/*`,
      ])
        .pipe(logger({
          before: 'Starting copy assets...',
          after: 'Copy complete!',
          showChnage: true,
        }))
        .pipe(gulp.dest('./dist', {
          cwd: path.resolve(cwd, `${rootPath}`),
        }));

      gulp.src([
        `${rootPath}/**/*.js`,
        `!${rootPath}/dist/**/*.js`,
      ])
        .pipe(logger({
          before: 'Starting uglify scripts...',
          after: 'Uglify complete!',
          showChnage: true,
        }))
        .pipe(uglify({
          warnings: true,
          compress: {
            dead_code: true,
            drop_debugger: true,
          },
          mangle: true,
          ie8: false,
        }))
        .pipe(gulp.dest('./dist', {
          cwd: path.resolve(cwd, `${rootPath}`),
        }));

      gulp.src([
        `${rootPath}/**/*.css`,
        `!${rootPath}/dist/**/*.css`,
      ])
        .pipe(logger({
          before: 'Starting cleancss...',
          after: 'Cleancss complete!',
          showChnage: true,
        }))
        .pipe(cleanCSS())
        .pipe(gulp.dest('./dist', {
          cwd: path.resolve(cwd, `${rootPath}`),
        }));

        const versionContent = `var VERSION = ${new Date().getTime()};`;
        fs.writeFile(`${rootPath}/version.js`, versionContent);

    } else {
      process.exit(-1);
    }
  });
  
};