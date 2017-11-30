const fs = require("fs");
const path = require("path");
const stream = require("stream");
const chalk = require("chalk");
const inquirer = require("inquirer");
const gulp = require("gulp");
const uglifyjs = require("uglify-es");
const composer = require("gulp-uglify/composer");
const cleanCSS = require("gulp-clean-css");
const logger = require("gulp-logger");
const gulpif = require("gulp-if");
const Rx = require("rx-lite");
const pump = require("pump");

const getSubdirChoices = require("./getSubdirChoices");

const makePrompt = ({ name, message, choices }) => ({
  type: "list",
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
const minify = composer(uglifyjs, console);

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
        case "project":
          fs.readdir(path.resolve(cwd, answer), (err, data) => {
            const subDir = data.filter(d => !d.startsWith("."));
            prompts.onNext(
              makePrompt({
                name: "branch",
                message: `Please select the ${chalk.yellow(
                  "directory"
                )} or branch to compile`,
                choices: subDir,
              })
            );
          });
          break;
        case "branch":
          const confirmDirectory = path.resolve(
            cwd,
            `${cacheAnswer.project}/${cacheAnswer.branch}`
          );
          prompts.onNext({
            type: "confirm",
            name: "directory",
            message: `Is this the exactly ${chalk.yellow(
              "directory"
            )} (${chalk.green(confirmDirectory)}) you wanna to compile`,
            default: false,
          });
          break;
        case "directory":
          if (!cacheAnswer.directory) return prompts.onCompleted();
          const projectDirectory = path.resolve(
            cwd,
            `${cacheAnswer.project}/${cacheAnswer.branch}`
          );
          fs.readdir(projectDirectory, (err, data) => {
            const subDir = data.filter(d => {
              return (
                d !== "dist" &&
                !d.startsWith(".") &&
                fs.statSync(path.join(projectDirectory, d)).isDirectory()
              );
            });
            prompts.onNext({
              type: "checkbox",
              name: "minifyDirs",
              message:
                "Please select the dirs that you want to apply compressing.",
              default: subDir.filter(d => d.endsWith("Modules")),
              choices: subDir,
            });
          });
          break;
        case "minifyDirs":
          let hasModules = answer.filter(d => d.endsWith("Modules"));
          if (!hasModules.length) {
            prompts.onNext({
              type: "list",
              name: "uglyStrategy",
              message: "未选中文件处理策略",
              default: "不做处理",
              choices: ["不做处理", "直接复制"],
            });
          } else {
            const { defaultChoices, choices } = getSubdirChoices(
              path.resolve(
                cwd,
                `${cacheAnswer.project}/${cacheAnswer.branch}`,
                hasModules[0]
              )
            );
            prompts.onNext({
              type: "checkbox",
              name: "subDirs",
              message:
                "Please select the  sub dirs that you want to apply compressing.",
              default: defaultChoices,
              choices: choices.concat(["All"]),
              pageSize: 15,
            });
          }
          break;
        case "subDirs":
          prompts.onNext({
            type: "list",
            name: "uglyStrategy",
            message: "未选中文件处理策略",
            default: "不做处理",
            choices: ["不做处理", "直接复制"],
          });
          break;
        case "uglyStrategy":
          prompts.onCompleted();
          break;
        default:
          prompts.onCompleted();
          break;
      }
    },
    err => {
      console.log(chalk.red(err));
    }
  );

  prompts.onNext(
    makePrompt({
      name: "project",
      message: "Please select the project to compile",
      choices: projectList,
    })
  );

  iq.then(answers => {
    if (answers.directory) {
      const rootPath = `${answers.project}/${answers.branch}`;
      const minifyDirs = answers.minifyDirs;
      let hasModules = minifyDirs.filter(d => d.endsWith("Modules")).length;
      let subDirs = answers.subDirs;
      let fileSrc;
      let initArr = [];
      let minifyJS = [];
      let minifyCSS = [];
      if (answers.uglyStrategy === "不做处理") {
        initArr = [`${rootPath}/*`];
      } else {
        initArr = [`${rootPath}/**/*`, `!${rootPath}/dist/**/*`];
      }

      if (hasModules && subDirs.indexOf("All") === -1) {
        fileSrc = minifyDirs.reduce((prev, dir) => {
          if (dir.endsWith("Modules")) {
            return prev.concat(
              subDirs.reduce((subPrev, subDir) => {
                minifyJS.push(`${rootPath}/${dir}/${subDir}/**/*.js`);
                minifyCSS.push(`${rootPath}/${dir}/${subDir}/**/*.css`);
                return subPrev.concat([
                  `${rootPath}/${dir}/${subDir}/**/*`,
                  `!${rootPath}/${dir}/${subDir}/**/*.js`,
                  `!${rootPath}/${dir}/${subDir}/**/*.css`,
                ]);
              }, [])
            );
          } else {
            minifyJS.push(`${rootPath}/${dir}/**/*.js`);
            minifyCSS.push(`${rootPath}/${dir}/**/*.css`);
            return prev.concat([
              `${rootPath}/${dir}/**/*`,
              `!${rootPath}/${dir}/**/*.js`,
              `!${rootPath}/${dir}/**/*.css`,
            ]);
          }
        }, initArr);
      } else {
        fileSrc = minifyDirs.reduce((prev, dir) => {
          minifyJS.push(`${rootPath}/${dir}/**/*.js`);
          minifyCSS.push(`${rootPath}/${dir}/**/*.css`);
          return prev.concat([
            `${rootPath}/${dir}/**/*`,
            `!${rootPath}/${dir}/**/*.js`,
            `!${rootPath}/${dir}/**/*.css`,
          ]);
        }, initArr);
      }
      pump([
        gulp.src(fileSrc, {
          base: rootPath,
        }),
        logger({
          before: "Starting copy assets...",
          after: "Copy complete!",
          showChange: true,
        }),
        gulp.dest("./dist", {
          cwd: path.resolve(cwd, `${rootPath}`),
        }),
      ]);

      pump(
        [
          gulp.src(minifyJS, {
            base: rootPath,
          }),
          logger({
            before: "Starting uglify scripts...",
            after: "Uglify complete!",
            showChange: true,
          }),
          gulpif(
            file => {
              if (path.basename(file.path, ".js").includes(".min")) {
                return false;
              }
              return true;
            },
            minify({
              warnings: true,
              compress: {
                dead_code: true,
                drop_debugger: true,
              },
              mangle: false,
              ie8: false,
            })
          ),
          gulp.dest(`./dist`, {
            cwd: path.resolve(cwd, `${rootPath}`),
          }),
        ],
        function(err) {
          if (err) {
            console.log(chalk.red(err));
          }
        }
      );
      pump(
        [
          gulp.src(minifyCSS, {
            base: rootPath,
          }),
          logger({
            before: "Starting cleancss...",
            after: "Cleancss complete!",
            showChange: true,
          }),
          gulpif(
            file => {
              if (path.basename(file.path, ".css").includes(".min")) {
                return false;
              }
              return true;
            },
            cleanCSS({
              rebase: false,
            })
          ),
          gulp.dest(`./dist`, {
            cwd: path.resolve(cwd, `${rootPath}`),
          }),
        ],
        function(err) {
          if (err) {
            console.log(chalk.red(err));
          }
        }
      );

      const versionContent = `var VERSION = ${new Date().getTime()};`;
      fs.writeFile(`${rootPath}/version.js`, versionContent, err => {
        if (err) console.log(err);
      });

      console.log(chalk.green("Build Success!"));
    } else {
      process.exit(-1);
    }
  });
};
