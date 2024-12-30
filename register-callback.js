const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env

// Environment variables for Safaricom credentials and URLs
const {
  LIVE_APP_CONSUMER_KEY,
  LIVE_APP_CONSUMER_SECRET,
  BUSINESS_SHORT_CODE,
  CALLBACK_URL,
  VALIDATION_URL,
} = process.env;

// Safaricom API endpoints
const OAUTH_TOKEN_URL = 'https://api.safaricom.co.ke/oauth/v2/generate?grant_type=client_credentials';
const C2B_REGISTER_URL = 'https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl';

// Function to get the access token
async function getAccessToken() {
  console.log('[DEBUG] Starting getAccessToken function...');
  try {
    const authHeader = `Basic ${Buffer.from(`${LIVE_APP_CONSUMER_KEY}:${LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    console.log('[DEBUG] Authorization Header:', authHeader); // Debug log

    const response = await axios.get(OAUTH_TOKEN_URL, {
      headers: { Authorization: authHeader },
    });

    console.log('[DEBUG] Access Token Response:', response.data); // Debug log
    return response.data.access_token;
  } catch (error) {
    console.error('[ERROR] Error fetching access token:', error.response?.data || error.message);
    throw new Error('Failed to fetch access token.');
  }
}

// Function to register C2B callback URLs
async function registerC2B() {
  console.log('[DEBUG] Starting registerC2B function...');
  try {
    const token = await getAccessToken();
    console.log('[DEBUG] Access token received:', token);

    const payload = {
      ShortCode: BUSINESS_SHORT_CODE,
      ResponseType: 'Completed',
      ConfirmationURL: CALLBACK_URL,
      ValidationURL: VALIDATION_URL,
    };

    console.log('[DEBUG] Payload:', payload); // Debug log

    const response = await axios.post(C2B_REGISTER_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[DEBUG] C2B Registration Response:', response.data);

    if (response.data.ResponseCode === '0') {
      console.log('[INFO] C2B Registration successful:', response.data);
      return {
        success: true,
        message: 'C2B Registration successful.',
        data: response.data,
      };
    } else {
      console.error('[ERROR] C2B Registration failed:', response.data.ResponseDescription);
      throw new Error(`C2B Registration failed: ${response.data.ResponseDescription}`);
    }
  } catch (error) {
    console.error('[ERROR] Error during C2B registration:', error.response?.data || error.message);
    throw new Error('Failed to register C2B URLs.');
  }
}

// Main execution
(async () => {
  console.log('[DEBUG] Script started...');
  try {
    const result = await registerC2B();
    console.log('[INFO] Registration Result:', result);
  } catch (error) {
    console.error('[ERROR] Script encountered an error:', error.message);
  }
})();
