const axios = require('axios');

// Safaricom credentials from environment variables
const LIVE_APP_CONSUMER_KEY = process.env.LIVE_APP_CONSUMER_KEY;
const LIVE_APP_CONSUMER_SECRET = process.env.LIVE_APP_CONSUMER_SECRET;
const BUSINESS_SHORT_CODE = process.env.BUSINESS_SHORT_CODE;
const CALLBACK_URL = process.env.CALLBACK_URL;
const VALIDATION_URL = process.env.VALIDATION_URL;
const STK_PUSH_URL = process.env.STK_PUSH_URL;

// API URL for access token generation
const OAUTH_TOKEN_URL = 'https://api.safaricom.co.ke/oauth/v2/generate?grant_type=client_credentials';

// Function to get access token
async function getAccessToken() {
    const authHeader = `Basic ${Buffer.from(`${LIVE_APP_CONSUMER_KEY}:${LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    console.log('Authorization Header:', authHeader);  // Log the Authorization header to ensure it's correct

    try {
        // Sending GET request to fetch the access token
        const response = await axios.get(OAUTH_TOKEN_URL, {
            headers: {
                Authorization: authHeader,  // Authorization header with base64 encoded credentials
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
        Shortcode: BUSINESS_SHORT_CODE, // Correct Shortcode from Safaricom portal
        ResponseType: 'Completed',
        ConfirmationURL: CALLBACK_URL, // Your confirmation URL
        ValidationURL: VALIDATION_URL, // Your validation URL
    };

    console.log('Payload:', payload);  // Log the payload to ensure it is correct

    try {
        // Send C2B registration request
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
