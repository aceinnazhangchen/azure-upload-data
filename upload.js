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
            var values = obj[0].data[i];
            values.push(raw_data_root+'/'+values[0]);
            
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
    for(let i in dirlist){
      let file = dirlist[i];
      let selectSql = `SELECT COUNT(id) as count FROM result_data_table where dataset=\'${file}\' and version=\`${version}\``;
      let result = await db.select(selectSql).catch((err) => {
        console.error("select error:", err.message);
      });
      if(result && result[0].count == 1){
        continue;
      }

      var params = {
        dataset:file,
        version:version,
        blob:result_data_root +'/'+version+'/'+file,
        time:time
      };
      var upload_path = path.join(local_path,file);
      await storage.uploadAllFile(upload_path,params.blob);

      var addSql = 'INSERT INTO result_data_table SET ?';
      let result2 = await db.insert(addSql,params).catch((err) => {
        console.error("insert error:", err.message);
      });
      if(result2){
        console.log('The insert solution is: ', result2);
      }
    }
}

module.exports = {
  uploadRawData,
  uploadResultData
}