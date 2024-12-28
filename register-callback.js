const axios = require('axios');
require('dotenv').config();

async function getAccessToken() {
    const authHeader = `Basic ${Buffer.from(`${process.env.LIVE_APP_CONSUMER_KEY}:${process.env.LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    try {
        const response = await axios.post(
            process.env.OAUTH_TOKEN_URL,
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
        Shortcode: process.env.BUSINESS_SHORT_CODE,
        ResponseType: 'Completed',
        ConfirmationURL: process.env.CONFIRMATION_URL,
        ValidationURL: process.env.VALIDATION_URL,
    };

    console.log('Payload:', payload);  // Log the payload to check values

    try {
        const response = await axios.post(
            `${process.env.MPESA_BASE_URL}/mpesa/c2b/v2/registerurl`,
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
