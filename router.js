const express = require('express')
const router = express.Router()

const redis = require("redis")
const client = redis.createClient();

const {promisify} = require('util');
const clientAsync = promisify(client).bind(client);

const accountSid = 'ACe2c7b0d9b21831777ff45057cb00bae6';
const authToken = 'e4fc04a630775a1449eb1a8572bd0a95';
const client = require('twilio')(accountSid, authToken);

router.post('/sms/verficationcode', (req, res) => {
  let mobile = req.query.mobile
  client.messages
      .create({
        body: Math.random().toString().slice(-6),
        from: '+15017122661',
        to: mobile
      }).then(message => console.log(message.sid));
})

router.post('/signup', (req, res) => {
  console.log(req)
  
})