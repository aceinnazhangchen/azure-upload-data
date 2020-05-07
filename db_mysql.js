const mysql = require('mysql');
const config = require('./config.json');

var connection = mysql.createConnection(config.mysql);

async function dbconnect(){
  return new Promise((resolve, reject) => {
    connection.connect(function (err){
      if (err) {
        console.error('error connecting:' + err.stack)
      }else{
        console.log('connected as id ' + connection.threadId);
      }
      resolve(err);
    });
  });
}

async function select(sql){
  return new Promise((resolve, reject) => {
    connection.query(sql,function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  });
}

async function insert(sql,params){
  return new Promise((resolve, reject) => {
    connection.query(sql,params,function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  });
}

async function update(sql,params){
  return new Promise((resolve, reject) => {
    connection.query(sql,params,function (error, results) {
      if (error) reject(error);
      resolve(results);
    });
  });
}

async function dbend(){
  return new Promise((resolve, reject) => {
    connection.end(function (err){
      if (err) {
        console.error('error ending:' + err.stack)
      }else{
        console.log('[connection end] succeed!');
      }
      resolve(err);
    });
  });
}

module.exports = { 
  dbconnect, 
  select,
  insert,
  update,
  dbend,
}; 