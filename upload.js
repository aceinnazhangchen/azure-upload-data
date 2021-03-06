const xlsx  = require('node-xlsx');
const db = require('./db_mysql');
const storage = require('./storage');
const path = require("path");
const file_sys = require('./utils/file_sys');
const config = require('./config.json');

const xlsx_file= config.xlsx_file;

const raw_data_path = config.raw_data_path;
const result_data_path = config.result_data_path;
const raw_data_root = 'rawDataSet';
const result_data_root = 'resultDataSet';

const timeLetters = 'abcdefghijklmnopqrstuvwxyz';
function getTimebyLetter(letter){
  return timeLetters.indexOf(letter);
}

async function uploadRawData(){
    await db.dbconnect();
    await storage.InitClient();
  
    let obj = xlsx.parse(xlsx_file);
    var feilds = [];
    for (let i in obj[0].data){
        if(i == 0){
            feilds = obj[0].data[0];
            console.log(feilds);
        }
        else if(i > 0){
            //blob
            var values = obj[0].data[i];
            values.push(raw_data_root+'/'+values[0]);
            //time
            var letter = values[0].substr(11,1);
            var hour = getTimebyLetter(letter);
            var minute = values[0].substr(12,2);
            var date_str = values[3].replace(/\./g,'/') + ' ' + hour+':'+minute+':'+'00';
            var date = new Date(date_str).getTime();
            values.push(date);
  
            var selectSql = `SELECT COUNT(id) as count FROM raw_data_table where dataset=\'${values[0]}\'`;
            console.log(selectSql);
            let result = await db.select(selectSql).catch((err) => {
              console.error("select error:", err.message);
            });
            if(result && result[0].count == 1){
              continue;
            }
           
            var params = {};
            for(let k in feilds){
              let key = feilds[k];
              params[key] = values[k];
            }  
            var upload_path = path.join(raw_data_path,values[0]);
            await storage.uploadAllFile(upload_path,params.blob);

            var addSql = 'INSERT INTO raw_data_table SET ?';
            let result2 = await db.insert(addSql,params).catch((err) => {
              console.error("insert error:", err.message);
            });
            if(result2){
              console.log('The insert solution is: ', result2);
            }
        }
    }
  
    await db.dbend();
}

async function uploadResultData(version){
    if(version == ''){
        return;
    }
    var local_path = path.join(result_data_path,version);
    if(await file_sys.fileExists(local_path) == false){
      return;
    }

    await db.dbconnect();
    await storage.InitClient();

    let {err:er,data:dirlist} = await file_sys.readDir(local_path);
    if(er){
      console.error("readDir error:", err.message);
      return;
    }
    var time = new Date().getTime();
    var versionParams = {
      version:version,
      time:time
    };

    var addVersionSql = 'REPLACE INTO data_vesion_table SET ?';
    let result_version = await db.insert(addVersionSql,versionParams).catch((err) => {
      console.error("REPLACE error:", err.message);
    });
    if(result_version){
      console.log('The REPLACE solution is: ', result_version);
    }

    for(let i in dirlist){
      let update = 0;
      let file = dirlist[i];
      let selectSql = `SELECT COUNT(id) as count FROM result_data_table where dataset=\'${file}\' and version=\'${version}\'`;
	    console.log(selectSql);
      let result = await db.select(selectSql).catch((err) => {
        console.error("select error:", err.message);
      });
      if(result && result[0].count >= 1){
        update = 1;
      }

      var params = {
        dataset:file,
        version:version,
        blob:result_data_root +'/'+version+'/'+file,
        time:time
      };
      var upload_path = path.join(local_path,file);
      await storage.uploadAllFile(upload_path,params.blob);

      if(update == 0)//insert new line
      {
        var addSql = 'INSERT INTO result_data_table SET ?';
        let result2 = await db.insert(addSql,params).catch((err) => {
          console.error("insert error:", err.message);
        });
        if(result2){
          console.log('The insert solution is: ', result2);
        }
      }
      else if(update == 1){
        var updateSql = 'UPDATE result_data_table SET time=? where dataset=? and version=?';
        var update_params = [time,file,version];
        let result2 = await db.update(updateSql,update_params).catch((err) => {
          console.error("update error:", err.message);
        });
        if(result2){
          console.log('The update solution is: ', result2);
        }
      }
    }

    await db.dbend();
}

module.exports = {
  uploadRawData,
  uploadResultData
}