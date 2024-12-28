const axios = require('axios');

const LIVE_APP_CONSUMER_KEY = 'WhuFPb2pGxtaFQN5hx7HxV6JixQE9Tl3JQWJV7XxDJtvl3J4'; // Direct key
const LIVE_APP_CONSUMER_SECRET = 's0WL93eRWFjkUAgdoKsT58fYABKNRly4AJ9A97UWgaXblV1zpgzog5wjJhvHGsii'; // Direct secret
const OAUTH_TOKEN_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'; // Direct URL

async function getAccessToken() {
    const authHeader = `Basic ${Buffer.from(`${LIVE_APP_CONSUMER_KEY}:${LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    console.log('Authorization Header:', authHeader); // Log the Authorization header

    try {
        const response = await axios.post(
            OAUTH_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            { headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        console.log('Access Token Response:', response.data); // Log the response to check
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
        Shortcode: '5467572', // Use direct shortcode
        ResponseType: 'Completed',
        ConfirmationURL: 'https://sanfiat.antocapteknologies.com/api/confirmation',
        ValidationURL: 'https://sanfiat.antocapteknologies.com/api/validation',
    };

    console.log('Payload:', payload); // Log the payload to check values

    try {
        const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl',
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
