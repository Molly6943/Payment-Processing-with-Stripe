# Payment-Processing-with-Stripe
## Requirements
* node version: node v10 or higher
## How to run
1. sign up for a stripe account and replace some values in the config.js
2. run `npm install`
3. install Stripe CLI, see https://stripe.com/docs/stripe-cli
4. run `stripe listen --forward-to localhost:3000/webhook`
5. run `node server.js`
6. open http://localhost:3000/app

## How to test
1. use 4242424242424242 as a test card number with any CVC + future expiration date.
see https://stripe.com/docs/testing
