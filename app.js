const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const path = require("path");
const file_sys = require('./utils/file_sys');

// Enter your storage account name and shared key
const account = process.env.ACCOUNT_NAME || "";
const accountKey = process.env.ACCOUNT_KEY || "";
const localRoot = process.env.REGRESSION_DATA_PATH || "";
const containerName = "dateset";

// Use StorageSharedKeyCredential with storage account and account key
// StorageSharedKeyCredential is only avaiable in Node.js runtime, not in browsers
const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential
);

async function CreateContainer(){
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const createContainerResponse = await containerClient.create();
    console.log(`Create container ${containerName} successfully`, createContainerResponse.requestId);
    return containerClient;
}

async function UploadFile(blobName,containerClient){
    const localpath = path.join(localRoot,blobName);
    let exist = await file_sys.fileExists(localpath);
    if(exist){
        const blobClient = containerClient.getBlobClient(blobName);
        const blockBlobClient = blobClient.getBlockBlobClient();
        const uploadBlobResponse = await blockBlobClient.uploadFile(localpath,{
            concurrency: 20,
            onProgress: (ev) => console.log(ev)
            });
        console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    }
}

async function main() {
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

    var blobList =[];
    for await (const blob of containerClient.listBlobsFlat()) {
        blobList.push(blob.name);
    }

    let {err:er1,data:dirlist} = await file_sys.readDir(localRoot);
    if(er1){
        console.log(er1);
    }else{
        for(let i in dirlist){
            let {err:er2,data:filelist} = await file_sys.readDir(path.join(localRoot ,dirlist[i]));
            if(er2){
                console.log(er2);
            }else{
                console.log(filelist);
                for(let j in filelist){
                    let blobName = dirlist[i]+"/"+filelist[j];
                    let blobexist = blobList.includes(blobName);
                    if(!blobexist){
                        await UploadFile(blobName,containerClient);
                    }
                }
            }
        }
    }
  }

  module.exports = { main };
   
  main().catch((err) => {
    console.error("Error running sample:", err.message);
  });