const upload = require('./upload');

function main(){
    var args = process.argv.splice(2)
    console.log(args);
    if(args[0] == 'raw'){
        upload.uploadRawData();
    }else if(args[0] == 'result'){
        upload.uploadResultData(args[1]);
    }
}

main();
