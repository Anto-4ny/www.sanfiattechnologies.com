const axios = require('axios');

// Safaricom credentials
const LIVE_APP_CONSUMER_KEY = 'WhuFPb2pGxtaFQN5hx7HxV6JixQE9Tl3JQWJV7XxDJtvl3J4';
const LIVE_APP_CONSUMER_SECRET = 's0WL93eRWFjkUAgdoKsT58fYABKNRly4AJ9A97UWgaXblV1zpgzog5wjJhvHGsii';

// API URL for access token generation
const OAUTH_TOKEN_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

// Function to get access token
async function getAccessToken() {
    const authHeader = `Basic ${Buffer.from(`${LIVE_APP_CONSUMER_KEY}:${LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    console.log('Authorization Header:', authHeader);  // Log the Authorization header to ensure it's correct

    try {
        const response = await axios.get(OAUTH_TOKEN_URL, {
            headers: {
                Authorization: authHeader,  // Authorization header with base64 encoded credentials
                'Content-Type': 'application/x-www-form-urlencoded', // You can remove this line if it's not required in the GET request
            }
        });
        
        console.log('Access Token Response:', response.data); // Log the access token response
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        return null;
    }
}

// Example of making a C2B registration call
async function registerC2B() {
    const token = await getAccessToken();
    if (!token) {
        console.error('Failed to get access token.');
        return;
    }

    const payload = {
        Shortcode: '4904474', // Shortcode from Safaricom portal
        ResponseType: 'Completed',
        ConfirmationURL: 'https://sanfiat.antocapteknologies.com/api/confirmation', // Your confirmation URL
        ValidationURL: 'https://sanfiat.antocapteknologies.com/api/validation', // Your validation URL
    };

    console.log('Payload:', payload);  // Log the payload to ensure it is set correctly

    try {
        const response = await axios.post(
            'https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl',  // C2B Registration URL
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,  // Use the access token here
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data.ResponseCode === '0') {
            console.log('C2B Registration successful:', response.data);
        } else {
            console.error('C2B Registration issue:', response.data);
        }
    } catch (error) {
        console.error('Error during C2B registration:', error.response?.data || error.message);
    }
}

// Run the function to register C2B
registerC2B();
