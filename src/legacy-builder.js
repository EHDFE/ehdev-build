const fs = require('fs');
const path = require('path');
const stream = require('stream');
const chalk = require('chalk');
const inquirer = require('inquirer');
const gulp = require('gulp');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const logger = require('gulp-logger');
const gulpif = require('gulp-if');
const Rx = require('rx-lite');
const pump = require('pump');

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
      
      pump([
        gulp.src([
          `${rootPath}/**/*`,
          `!${rootPath}/**/*.js`,
          `!${rootPath}/**/*.css`,
          `!${rootPath}/dist/**/*`,
        ]),
        logger({
          before: 'Starting copy assets...',
          after: 'Copy complete!',
          showChnage: true,
        }),
        gulp.dest('./dist', {
          cwd: path.resolve(cwd, `${rootPath}`),
        }),
      ]);

      pump([
        gulp.src([
          `${rootPath}/**/*.js`,
          `!${rootPath}/dist/**/*.js`,
        ]),
        logger({
          before: 'Starting uglify scripts...',
          after: 'Uglify complete!',
          showChnage: true,
        }),
        gulpif(
          (file) => {
            if (path.basename(file.path, '.js').includes('.min')) {
              return false;
            }
            return true;
          },
          uglify({
            warnings: true,
            compress: {
              dead_code: true,
              drop_debugger: true,
            },
            mangle: false,
            ie8: false,
          })
        ),
        gulp.dest('./dist', {
          cwd: path.resolve(cwd, `${rootPath}`),
        }),
      ], function(err){
        console.log(chalk.red(err));
      });

      pump([
        gulp.src([
          `${rootPath}/**/*.css`,
          `!${rootPath}/dist/**/*.css`,
        ]),
        logger({
          before: 'Starting cleancss...',
          after: 'Cleancss complete!',
          showChnage: true,
        }),
        gulpif(
          (file) => {
            if (path.basename(file.path, '.css').includes('.min')) {
              return false;
            }
            return true;
          },
          cleanCSS({
            rebase: false,
          })
        ),
        gulp.dest('./dist', {
          cwd: path.resolve(cwd, `${rootPath}`),
        }),
      ], function(err){
        console.log(chalk.red(err));
      });

        const versionContent = `var VERSION = ${new Date().getTime()};`;
        fs.writeFile(`${rootPath}/version.js`, versionContent);

        console.log(chalk.green('构建成功！'));
    } else {
      process.exit(-1);
    }
  });
  
};