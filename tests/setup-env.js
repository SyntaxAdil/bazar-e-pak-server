// Runs before any test file: config/env.js validates process.env at import time.
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "mongodb://127.0.0.1:27017/unit-tests-never-connected",
  SERVER_URL: "https://api.test.example",
  CLIENT_URL: "https://shop.test.example",
  TRUSTED_ORIGINS: "https://shop.test.example",
  COD_ENABLED: "true",
  PAYFAST_ENABLED: "true",
  PAYFAST_ENV: "sandbox",
  PAYFAST_API_BASE_URL: "https://payfast.test/api",
  PAYFAST_MERCHANT_ID: "TEST_MERCHANT",
  PAYFAST_SECURED_KEY: "TEST_SECRET_KEY_do_not_use",
  PAYFAST_METHODS: "CARD,ACCOUNT,WALLET",
  PAYFAST_ESTIMATED_FEE_BPS: "0",
});
