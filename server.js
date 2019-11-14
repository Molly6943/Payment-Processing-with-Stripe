const http = require('http');
const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const session = require('express-session');

const mustacheExpress = require('mustache-express')

const sqlite = require('./async_sqlite.js')

var startServer = () => new Promise((resolve, reject) => {
  const apiRouter = require('./router.js')

  app.use(bodyParser.json({ limit: '10mb' }))
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: false }))

  app.use(session({
    secret : 'secret',
    resave : true,
    saveUninitialized: false,
    cookie : {
      // maxAge : 1000 * 60 * 3,
    }
  }))

  app.engine('html', mustacheExpress())
  app.set('view engine', 'html')
  app.set('views', __dirname + '/views')

  app.use('/css', express.static(__dirname + '/css'));
  app.use('/views', express.static(__dirname + '/views'));

  app.use('/', apiRouter)

  app.get('/app', (req, res) => {
    res.sendfile(__dirname + '/views/login.html');
  })

  http.createServer(app).listen(3000, (err) => {
    console.log('Express server listening on port 3000');
    err ? reject(err) : resolve()
  });
})

var runSql = async () => {
  await sqlite.open('./lab5.db')

  await sqlite.run(`CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    full_name     VARCHAR(48) NOT NULL,
    email         VARCHAR(56) NOT NULL,
    password      VARCHAR(256),
    mobile        VARCHAR(18),
    birthday      TEXT,
    subscription  TEXT,
    type          CHAR(8) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT current_timestamp,
    deleted       BOOLEAN DEFAULT false
  );`)

  await sqlite.run(`CREATE TABLE IF NOT EXISTS sms_records (
    id            INTEGER PRIMARY KEY,
    mobile        VARCHAR(18) NOT NULL,
    content       VARCHAR(640) NOT NULL,
    expired_at    TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT current_timestamp
  );`)
  
  await sqlite.run(`CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY,
    name          VARCHAR(18) NOT NULL UNIQUE,
    price         INTEGER
  );`)


  let adminUser = await sqlite.get(`SELECT * FROM users WHERE email = 'admin@app.com'`)
  if (!adminUser) {
    await sqlite.run(`
    INSERT INTO users(id, full_name, email, password, mobile, birthday, subscription, type)
    VALUES (NULL, 'admin', 'admin@app.com', 'admin', NULL, NULL, NULL, 'admin')`)
  }

  let basicService = await sqlite.get(`SELECT * FROM products WHERE name = 'Basic'`)
  if (!basicService) {
    await sqlite.run(`
    INSERT INTO products(id, name, price)
    VALUES (NULL, 'Basic', 10)`)
  }
  
  let plusService = await sqlite.get(`SELECT * FROM products WHERE name = 'Plus'`)
  if (!plusService) {
    await sqlite.run(`
    INSERT INTO products(id, name, price)
    VALUES (NULL, 'Plus', 20)`)
  }
  
  let advancedService = await sqlite.get(`SELECT * FROM products WHERE name = 'Advanced'`)
  if (!advancedService) {
    await sqlite.run(`
    INSERT INTO products(id, name, price)
    VALUES (NULL, 'Advanced', 30)`)
  }

  await startServer()
}
runSql()