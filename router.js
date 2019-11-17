const express = require('express')
const router = express.Router()

const sqlite = require('./async_sqlite')

const config = require('./config')

const twilioClient = require('twilio')(config.twilio.accountSid, config.twilio.authToken)

const stripe = require('stripe')(config.stripe.STRIPE_SECRET_KEY)

const verifyVerificationCode = async (mobile, verificationCode) => {
  var sms = await sqlite.get(`
    SELECT id, expired_at, content FROM sms_records
      WHERE mobile = '${mobile}'
      ORDER BY created_at DESC
      LIMIT 1`)
  console.log(sms)
  if (!sms || sms.expired_at < new Date() || sms.content !== verificationCode) {
    return false
  }
  return true
}

router.post('/sms/verficationcode', (req, res) => {
  let mobile = req.body.mobile
  let randomCode = Math.random().toString().slice(-6)
  twilioClient.messages
    .create({
      body: `Your verification code is: ${randomCode},this message will expire in 5 minutes.`,
      from: config.twilio.fromNumber,
      to: mobile
    }).then(message => {
      console.log(message.sid)
      let expireTime = new Date(new Date(message.date_sent) + (5 * 60 * 1000))
      let entry = `NULL,'${mobile}','${randomCode}', '${expireTime}', '${new Date(message.date_sent)}'`
      let insertSql = "INSERT INTO sms_records(id, mobile, content, expired_at, created_at) VALUES (" + entry + ")"
      sqlite.run(insertSql)
    })
})

router.post('/signup', async (req, res) => {
  var body = req.body
  var user = {}

  if (!(await verifyVerificationCode(body.mobile, body.smsVerificationCode))) {
    return res.status(401).send('Verification code error!')
  }

  try {
    user = await sqlite.get(`SELECT * FROM users WHERE email = '${body.email}' AND deleted = false`)
  } catch(err) {
    return res.status(500).end()
  }
  if (user) {
    return res.status(402).send('User already exsit!')
  }
  if (!body.fullName || !body.email || !body.mobile || !body.smsVerificationCode || !body.password) {
    return res.status(403).send('All inputs are required!')
  }
  try {
    let entry = `NULL,'${body.fullName}','${body.email}', '${body.password}', '${body.mobile}', '${body.birthday}', 'user', '${new Date()}'`
    let insertSql = "INSERT INTO users(id, full_name, email, password, mobile, birthday, type, created_at) VALUES (" + entry + ")"
    await sqlite.run(insertSql)
  } catch (err) {
    return res.status(500).end()
  }
  res.status(200).end()
})

router.get('/login', (req, res) => {
  res.sendfile(__dirname + '/views/login.html');
})

router.post('/login', async (req, res) => {
  let body = req.body
  let user = {}
  try {
    user = await sqlite.get(`SELECT * FROM users WHERE email = '${body.email}' AND deleted = false`)
  } catch(err) {
    return res.status(500).end()
  }
  if (user) {
    if (body.password !== user.password) {
      return res.status(402).send('Wrong password!')
    }
    if (user.type === 'admin') {
      req.session.login = true
      req.session.type = user.type
      res.status(200).send({redirect: `${config.domain}/admin`})
    }
    if (user.type === 'user') {
      req.session.login = true
      req.session.type = user.type
      req.session.user = user
      res.status(200).send({redirect: `${config.domain}/payment`})
    }
  } else {
    return res.status(401).send('User does not exsit!')
  }
})

router.get('/payment', async (req, res) => {
  let product, products, boughtName
  if (req.session.login && req.session.type === 'user') { 
    try {
      product = await sqlite.get(`SELECT * FROM products WHERE user_id =${req.session.user.id}`)
    } catch (err) {
      return res.status(500).end()
    }
    if (product) {
      products = config.products.filter((item) => item.plan_id !== product.plan_id)
      boughtName = product.name
    } else {
      products = config.products
      boughtName = false
    }
    products = products.map((item) => {
      item.price = item.price/100
      return item
    })
    res.render('subscription', {products: products, boughtName: boughtName})
  } else {
    return res.redirect('/login')
  }
})

router.get('/public-key', (req, res) => {
  res.send({
    publicKey: config.stripe.STRIPE_PUBLISHABLE_KEY
  })
})

router.post('/payment', async (req, res) => {
  let body = req.body;
  let session
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      client_reference_id: req.session.user.id,
      subscription_data: {
        items: [
          {
            plan: body.planId
          }
        ]
      },
      line_items: [
        {
          name: body.name,
          description: body.planId,
          amount: body.price,
          currency: 'usd',
          quantity: 1,
        },
      ],
      success_url: `${config.domain}/customer`,
      cancel_url: `${config.domain}/payment`
    })
  } catch (err) {
    return res.status(500).end()
  }
  res.send({
    checkoutSessionId: session.id
  })
})

// Webhook handler for asynchronous events.
router.post("/webhook", async (req, res) => {
  let eventType;
  let product;
  // Check if webhook signing is configured.
  if (config.stripe.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers["stripe-signature"];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        config.stripe.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data.object;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }
  if (eventType === "checkout.session.completed") {
    console.log(`🔔  Payment received!`);
    let item = data.display_items[0]
    try {
      product = await sqlite.get(`SELECT * FROM products WHERE user_id =${data.client_reference_id}`)
    } catch (err) {
      return res.status(500).end()
    }
    if (product) {
      try {
        await sqlite.run(`UPDATE products SET plan_id = '${item.custom.description}', name = '${item.custom.name}', price = ${item.amount} WHERE user_id = ${data.client_reference_id}`)
      } catch (err) {
        return res.status(500).end()
      }
    } else {
      try {
        let entry = `NULL,'${item.custom.description}','${data.client_reference_id}', '${item.custom.name}', '${item.amount}'`
        let insertSql = "INSERT INTO products(id, plan_id, user_id, name, price) VALUES (" + entry + ")"
        await sqlite.run(insertSql)
      } catch (err) {
        return res.status(500).end()
      }
    }
  }
  res.sendStatus(200);
});

router.post('/cancel', async (req, res) => {
  let id = req.body.id || req.session.user.id
  try {
    await sqlite.run(`UPDATE users SET deleted = true WHERE id = ${id}`)
  } catch(err) {
    return res.status(500).end()
  }
  try {
    await sqlite.run(`UPDATE products SET deleted = true WHERE user_id = ${id}`)
  } catch(err) {
    return res.status(500).end()
  }
  res.status(200).send('ok')
})

router.get('/admin', async (req, res) => {
  let userList = []
  if (req.session.login && req.session.type === 'admin') {
    try {
      userList = await sqlite.all(`SELECT * FROM users WHERE deleted = false AND type = 'user'`)
    } catch(err) {
      return res.status(500).end()
    }
    res.render('admin', { list: userList });
  } else {
    return res.redirect('/login')
  }
})

router.get('/customer', async (req, res) => {
  let user = {}
  let product, products
  if (req.session.login && req.session.type === 'user') {
    try {
      user = await sqlite.get(`SELECT * FROM users WHERE id = '${req.session.user.id}' AND deleted = false`)
    } catch(err) {
      return res.status(500).end()
    }
    try {
      product = await sqlite.get(`SELECT plan_id FROM products WHERE user_id =${req.session.user.id}`)
    } catch (err) {
      return res.status(500).end()
    }
    if (product) {
      products = config.products.filter((item) => item.plan_id !== product.plan_id)
    } else {
      products = config.products
    }
    res.render('customer', {user: user, products: products});
  } else {
    return res.redirect('/login')
  }
})

router.put('/customer', async (req, res) => {
  let body = req.body
  try {
    await sqlite.run(`UPDATE users SET birthday = '${body.birthday}', mobile = '${body.mobile}' WHERE id = ${req.session.user.id}`)
  } catch(err) {
    return res.status(500).end()
  }
  res.status(200).end()
})

router.put('/password', async (req, res) => {
  let body = req.body
  try {
    await sqlite.run(`UPDATE users SET password = '${body.password}' WHERE id = '${req.session.user.id}'`)
  } catch(err) {
    return res.status(500).end()
  }
  res.status(200).end()
})

module.exports = router