const http = require('http');
const express = require('express');
const app = express();

const mustacheExpress = require('mustache-express')

const apiRouter = require('./router.js')

app.engine('html', mustacheExpress())
app.set('view engin', 'html')
app.set('views', __dirname + '/views')

app.use('/css', express.static(__dirname + '/css'));
app.use('/views', express.static(__dirname + '/views'));

app.use('/api', apiRouter)

app.get('/app', function (req, res) {
  res.sendfile(__dirname + '/views/login.html');
});

http.createServer(app).listen(3000, () => {
  console.log('Express server listening on port 3000');
});

