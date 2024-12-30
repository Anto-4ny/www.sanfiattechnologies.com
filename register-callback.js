const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env

// Environment variables for Safaricom credentials and URLs (from .env)
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
  try {
    const authHeader = `Basic ${Buffer.from(`${LIVE_APP_CONSUMER_KEY}:${LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    console.log('[INFO] Authorization Header:', authHeader); // Debug log

    // Fetch access token
    const response = await axios.get(OAUTH_TOKEN_URL, {
      headers: {
        Authorization: authHeader,
      },
    });

    console.log('[INFO] Access Token Response:', response.data); // Debug log
    return response.data.access_token;
  } catch (error) {
    console.error('[ERROR] Error fetching access token:', error.response?.data || error.message);
    throw new Error('Failed to fetch access token.');
  }
}

// Function to register C2B callback URLs
async function registerC2B() {
  try {
    const token = await getAccessToken();
    const payload = {
      ShortCode: BUSINESS_SHORT_CODE,
      ResponseType: 'Completed',
      ConfirmationURL: CALLBACK_URL,
      ValidationURL: VALIDATION_URL,
    };

    console.log('[INFO] Payload:', payload); // Debug log

    const response = await axios.post(C2B_REGISTER_URL, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[INFO] C2B Registration Response:', response.data);

    if (response.data.ResponseCode === '0') {
      return {
        success: true,
        message: 'C2B Registration successful.',
        data: response.data,
      };
    } else {
      throw new Error(`C2B Registration failed: ${response.data.ResponseDescription}`);
    }
  } catch (error) {
    console.error('[ERROR] Error during C2B registration:', error.response?.data || error.message);
    throw new Error('Failed to register C2B URLs.');
  }
}

// Main function for GET request
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed, only GET is allowed.',
    });
  }

  try {
    console.log('[INFO] Received a GET request to register C2B callback URLs.');
    const result = await registerC2B();

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error('[ERROR] Error during callback URL registration:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
