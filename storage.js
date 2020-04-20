const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const file_sys = require('./utils/file_sys');
const path = require("path");
var fs = require("fs");

// Enter your storage account name and shared key
const account = process.env.ACCOUNT_NAME || "";
const accountKey = process.env.ACCOUNT_KEY || "";
const containerName = "dataset";

var containerClient;

// Use StorageSharedKeyCredential with storage account and account key
// StorageSharedKeyCredential is only avaiable in Node.js runtime, not in browsers
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential
);

async function CreateContainer(){
    containerClient = blobServiceClient.getContainerClient(containerName);
    const createContainerResponse = await containerClient.create();
    console.log(`Create container ${containerName} successfully`, createContainerResponse.requestId);
    return containerClient;
}

async function UploadFile(localpath,blobName){
    let exist = await file_sys.fileExists(localpath);
    if(exist){
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // const uploadBlobResponse = await blockBlobClient.uploadFile(localpath,{
        //     blockSize: 4 * 1024 * 1024, // 4MB block size
        //     concurrency: 20, // 20 concurrency
        //     onProgress: (ev) => console.log(ev)
        //     });
        const uploadBlobResponse = await blockBlobClient.uploadStream(fs.createReadStream(localpath), 4 * 1024 * 1024, 20, {
              onProgress: (ev) => console.log(ev)
            });
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    }
}

async function InitClient() {
    var containerList = [];
    for await (const container of blobServiceClient.listContainers()) {
        containerList.push(container);
    }
    var containerIndex = containerList.findIndex(function(value){
        return value.name == containerName;
    });

    if(containerIndex == -1){
        console.log("create containerClient")
        containerClient = await CreateContainer();
    }else{
        console.log("have containerClient")
        containerClient = blobServiceClient.getContainerClient(containerName);
    } 
}

async function uploadAllFile(localPath,blob){
    let {err:er,data:filelist} = await file_sys.readDir(localPath);
    if(er){
      console.log(er);
    }else{
      for(let i in filelist){
        let blobName = blob+"/"+filelist[i];
        let localfile = path.join(localPath,filelist[i]);
        await UploadFile(localfile,blobName);
      }
    }
  }

module.exports = { 
    UploadFile,
    uploadAllFile,
    InitClient
 };