const fs = require('fs');
const path = require('path');
const glob = require('glob');
const moment = require('moment');

function getSubdirChoices(dirPath){
	let defaultChoices;
	if(!fs.existsSync(path.resolve(dirPath, '../', './status.json'))){
		return getResultWithoutStatus(dirPath);
	}else {
		return getResult(dirPath);
	}
}

/**
 * 存在status.json的时候的情况
 * @param {*} dirPath 
 */
function getResult(dirPath) {
	let status = JSON.parse(fs.readFileSync(path.resolve(dirPath, '../', './status.json'), 'utf8')||'{}');
	let currStatus = getDirsTime(dirPath);
	let modifiedDir = [];
	let notModifiedDir = [];
	let newStatus = {};
	currStatus.forEach((d) => {
		newStatus[d.dirname] = d.mtime;
		if(status[d.dirname]&&(d.mtime === status[d.dirname])) {
			let resultItem = currStatus.shift();
			notModifiedDir.push(resultItem.dirname);
		}else {
			let resultItem = currStatus.shift();
			modifiedDir.push(resultItem.dirname);
		}
	});
	fs.writeFile(path.resolve(dirPath, '../', 'status.json'), JSON.stringify(newStatus), { encoding: 'utf-8' } ,(err)=> {
		if(err) throw err;
	});
	let choices = modifiedDir.concat(notModifiedDir);
	return {
		defaultChoices: modifiedDir,
		choices
	}
}


/**
 * 不存在status.json的情况
 */
function getResultWithoutStatus(dirPath) {

	let currStatus = getDirsTime(dirPath);
	let status = {};
 	let choices = currStatus.map((d) =>{
			status[d.dirname] = d.mtime
		 return d.dirname;
	});
	fs.writeFile(path.resolve(dirPath, '../', 'status.json'), JSON.stringify(status), { encoding: 'utf-8' } ,(err)=> {
		if(err) throw err;
		console.log('status.json has been saved');
	});
	return {
		defaultChoices: [],
		choices
	}
}


function getDirsTime(dirPath){
	var result = [];
	glob.sync('*', { cwd: dirPath}).forEach((d) => {
		let mtime = getTime(path.resolve(dirPath, d))[0].mtime;
		if (!result.length) {
      result.push({
        dirname: d,
				mtime
      });
    } else {
      for (let i = 0, len = result.length; i < len; i++) {
        if (result[i].mtime < mtime) {
          result.splice(i, 0, {
            dirname: d,
						mtime
          });
          break;
				}
				if(i === len - 1 ){
					result.push({
            dirname: d,
						mtime
          });
				}
      }
		}
		
	})
	return result;
}


/**
 * 给指定文件夹下所有文件按照修改时间从最近到以前的顺序排序
 * @param {*要排序的文件夹} dirPath 
 */
function getTime(dirPath) {
		var files = glob.sync('**/*',{ cwd: dirPath, nodir: true, realpath: true});
		return getArrayByTime(files);
}


/**
 *  
 * @param {* 要排序的的文件绝对路径数组} fileArr 
 */
function getArrayByTime(fileArr){
	var result = []
	fileArr.forEach(d => {
    var fileStatus = fs.statSync(d);
    mtime = moment(fileStatus.ctime).valueOf();
    if (!result.length) {
      result.push({
        fileName: path.basename(d),
				mtime,
				fullPath: d
      });
    } else {
      for (let i = 0, len = result.length; i < len; i++) {
        if (result[i].mtime < mtime) {
          result.splice(i, 0, {
            fileName: path.basename(d),
						mtime,
						fullPath: d
          });
          break;
				}
				if(i === len - 1 ){
					result.push({
            fileName: path.basename(d),
						mtime,
						fullPath: d
          });
				}
      }
		}
	});
	return  result;
}


module.exports = getSubdirChoices;