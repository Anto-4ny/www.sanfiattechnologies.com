const axios = require('axios');

// Helper: Get access token
async function getAccessToken() {
    const authHeader = `Basic ${Buffer.from(
        `${process.env.LIVE_APP_CONSUMER_KEY}:${process.env.LIVE_APP_CONSUMER_SECRET}`
    ).toString('base64')}`;

    const response = await axios.post(
        process.env.OAUTH_TOKEN_URL,
        new URLSearchParams({ grant_type: 'client_credentials' }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: authHeader,
            },
        }
    );

    return response.data.access_token;
}
async function registerCallbackURLs() {
    try {
        const token = await getAccessToken();

        const payload = {
            ShortCode: process.env.BUSINESS_SHORT_CODE,
            ResponseType: 'Completed',
            ConfirmationURL: process.env.CONFIRMATION_URL,
            ValidationURL: process.env.VALIDATION_URL,
        };

        console.log("Payload:", payload);
        console.log("Request URL:", `${process.env.MPESA_BASE_URL}/mpesa/c2b/v1/registerurl`);

        const response = await axios.post(
            `${process.env.MPESA_BASE_URL}/mpesa/c2b/v1/registerurl`,
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
