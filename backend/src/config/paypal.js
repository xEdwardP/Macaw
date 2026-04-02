const axios = require("axios");

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

let cachedToken = null;
let tokenExpiry = null;

const handlePaypalError = (err) => {
  const msg =
    err.response?.data?.message ||
    err.response?.data?.error_description ||
    err.message;
  throw new Error(`PayPal: ${msg}`);
};

const getAccessToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID,
          password: process.env.PAYPAL_CLIENT_SECRET,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    handlePaypalError(err);
  }
};

const createOrder = async (amount) => {
  try {
    const token = await getAccessToken();
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount.toFixed(2),
            },
            description: "Recarga de wallet Macaw",
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (err) {
    handlePaypalError(err);
  }
};

const captureOrder = async (orderId) => {
  try {
    const token = await getAccessToken();
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (err) {
    handlePaypalError(err);
  }
};

module.exports = { createOrder, captureOrder };
