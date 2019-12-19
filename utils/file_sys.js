var path = require('path');
var fs = require("fs");

const fileExists = function (src) {
    return new Promise((resolve, reject) => {
        fs.exists(src, (exists) => {
            resolve(exists);
        });
    });
}

const readFile = function (src) {
    return new Promise((resolve, reject) => {
        fs.readFile(src, (err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
}

const readDir = function (src) {
    return new Promise((resolve, reject) => {
        fs.readdir(src, (err, data) => {
            resolve({err,data});
        });
    });
}

module.exports = {
    fileExists,
    readFile,
    readDir,
};