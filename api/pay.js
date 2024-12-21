const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

// Initialize Firebase Admin SDK (only initialize once globally)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// Helper to get the current timestamp in Safaricom's expected format
function getCurrentTimestamp() {
    const now = new Date();
    return (
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0')
    );
}

// Helper to generate the password for STK push
function generatePassword(shortCode) {
    const timestamp = getCurrentTimestamp();
    const password = `${shortCode}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

// Fetch Access Token
async function getAccessToken() {
    try {
        // Use `application/x-www-form-urlencoded` for the body content
        const response = await axios.post(
            process.env.OAUTH_TOKEN_URL, // URL remains the same
            new URLSearchParams({
                grant_type: 'client_credentials', // Correct the format of the body
            }),
            {
                auth: {
                    username: process.env.LIVE_APP_CONSUMER_KEY, // Your Consumer Key
                    password: process.env.LIVE_APP_CONSUMER_SECRET, // Your Consumer Secret
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded', // Ensure correct content type
                },
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to fetch access token');
    }
}
try {
    console.log('Fetching access token...');
    const token = await getAccessToken();
    console.log('Access token fetched successfully:', token);
} catch (error) {
    console.error('Error fetching access token:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Failed to fetch access token' });
}



// Initiate STK Push
async function initiateSTKPush(token, phoneNumber, amount) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: generatePassword(process.env.BUSINESS_SHORT_CODE),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerPayBillOnline', // Ensure correct type
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: phoneNumber,
        TransactionDesc: `Payment to till ${process.env.BUSINESS_SHORT_CODE}`,
    };

    try {
        const response = await axios.post(process.env.STK_PUSH_URL, payload, { headers });
        console.log('STK Push Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error in STK Push:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        }
        throw new Error('Failed to initiate STK push');
    }
}

// Register Callback URLs
async function registerCallbackURLs(token) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const payload = {
        ShortCode: process.env.BUSINESS_SHORT_CODE, // Your shortcode (Paybill/Till number)
        ResponseType: 'Completed', // The type of response expected from Safaricom
        ConfirmationURL: process.env.CONFIRMATION_URL, // Callback URL for payment success
        ValidationURL: process.env.VALIDATION_URL, // Callback URL for validation (if enabled)
    };

    try {
        const response = await axios.post('https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl', payload, { headers });
        console.log('Callback URLs registered successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error registering callback URLs:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', error.response.data);
        }
        throw new Error('Failed to register callback URLs');
    }
}

// Main Handler Function
module.exports = async (req, res) => {
    const { phoneNumber, email } = req.body;

    if (!phoneNumber || !email) {
        return res.status(400).json({ error: 'Phone number and email are required.' });
    }

    const amount = 250;

    try {
        // Fetch access token
        const token = await getAccessToken();

        // Register Callback URLs (only register once in production, can be skipped if already done)
        await registerCallbackURLs(token);

        // Initiate STK push
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment details in Firestore
        await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'initiated',
            timestamp: new Date(),
        });

        return res.status(200).json({ message: 'Payment initiated successfully', stkResponse });
    } catch (error) {
        console.error('Error during payment process:', error);
        return res.status(500).json({ error: error.message });
    }
};
