const axios = require('axios');

// Safaricom API credentials and endpoints
const LIVE_APP_CONSUMER_KEY = 'WhuFPb2pGxtaFQN5hx7HxV6JixQE9Tl3JQWJV7XxDJtvl3J4';  // Replace with your actual key
const LIVE_APP_CONSUMER_SECRET = 's0WL93eRWFjkUAgdoKsT58fYABKNRly4AJ9A97UWgaXblV1zpgzog5wjJhvHGsii';  // Replace with your actual secret
const OAUTH_TOKEN_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const MPESA_BASE_URL = 'https://api.safaricom.co.ke';
const BUSINESS_SHORT_CODE = '5467572';  // Replace with your shortcode
const CONFIRMATION_URL = 'https://sanfiat.antocapteknologies.com/api/confirmation';  // Replace with your confirmation URL
const VALIDATION_URL = 'https://sanfiat.antocapteknologies.com/api/validation';  // Replace with your validation URL

async function getAccessToken() {
    const authHeader = `Basic ${Buffer.from(`${LIVE_APP_CONSUMER_KEY}:${LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    try {
        const response = await axios.post(
            OAUTH_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            { headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        return null;
    }
}

async function registerCallbackURLs() {
    const token = await getAccessToken();
    if (!token) {
        console.error('Failed to get access token.');
        return;
    }

    const payload = {
        Shortcode: BUSINESS_SHORT_CODE,
        ResponseType: 'Completed',
        ConfirmationURL: CONFIRMATION_URL,
        ValidationURL: VALIDATION_URL,
    };

    console.log('Payload:', payload);  // Log the payload to check values

    try {
        const response = await axios.post(
            `${MPESA_BASE_URL}/mpesa/c2b/v2/registerurl`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.ResponseCode === '0') {
            console.log('Callback URLs registered successfully:', response.data);
        } else {
            console.error('Callback URL registration issue:', response.data);
        }
    } catch (error) {
        console.error('Error during callback URL registration:', error.response?.data || error.message);
    }
}

registerCallbackURLs();
