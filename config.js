var base = {
  name: 'Payment Processing with Stripe',
  domain: 'http://localhost:3000',
  port: 3000,
  products: [{
    plan_id: 'plan_GBkHjmzT3qheQF',
    name: 'Basic',
    price: 1000
  }, {
    plan_id: 'plan_GBkIXEULY6m3CI',
    name: 'Plus',
    price: 2000
  }, {
    plan_id: 'plan_GBkIZwHHj20n71',
    name: 'Advanced',
    price: 3000
  }],
  twilio: {
    accountSid: 'ACe2c7b0d9b21831777ff45057cb00bae6',
    authToken: 'e4fc04a630775a1449eb1a8572bd0a95',
    fromNumber: '+15017122661'
  },
  stripe :{
    STRIPE_PUBLISHABLE_KEY: 'pk_test_RfYLUKejJQRJ0F1qPUuElzJ200TshPMv7z',
    STRIPE_SECRET_KEY: 'sk_test_orV9SHoUmRw4xKYnkKVk6ngW00hNGAmvFu',
    STRIPE_WEBHOOK_SECRET: 'whsec_gdtectUNSF66jICEAoo8xk3u8mM1OlAt'
  }
}

module.exports = base
