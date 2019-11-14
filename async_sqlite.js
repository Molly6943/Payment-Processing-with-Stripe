const sqlite3 = require('sqlite3').verbose()
var db

exports.db = db

exports.open = (path) => {
  return new Promise((resolve, reject) => {
    this.db = new sqlite3.Database(path, 
      function(err) {
        if(err){
          reject(`Open error: ${err.message}`)
        }else{
          resolve(`${path} opened`)
        }
      }
    )   
  })
}

// any query: insert/delete/update
exports.run = (query) => {
  return new Promise((resolve, reject) => {
    this.db.run(query, 
      function(err) {
        if(err){
          reject(err.message)
        }else{
          resolve(true)
        }
    })
  })    
}

// first row read
exports.get = (query, params) => {
  return new Promise((resolve, reject) => {
    this.db.get(query, params, function(err, row)  {
      if(err) {
        reject(`Read error: ${err.message}`)
      }else{
        resolve(row)
      }
    })
  }) 
}

// set of rows read
exports.all = (query, params) => {
  return new Promise((resolve, reject) => {
    if(params == undefined){
      params=[]
    }
    this.db.all(query, params, function(err, rows)  {
      if(err){
        reject(`Read error: ${err.message}`)
      }else {
        resolve(rows)
      }
    })
  }) 
}

exports.close = function() {
  return new Promise((resolve, reject) => {
    this.db.close()
    resolve(true)
  }) 
}