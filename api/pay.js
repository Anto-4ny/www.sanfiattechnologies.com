const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

// Initialize Firebase Admin SDK (only initialize once globally)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines in private key
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI,
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        }),
    });
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

async function getAccessToken() {
    try {
        const response = await axios.post(
            process.env.OAUTH_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                auth: {
                    username: process.env.LIVE_APP_CONSUMER_KEY,
                    password: process.env.LIVE_APP_CONSUMER_SECRET,
                },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        );

        console.log('Access Token Response:', response.data); // Debug full response
        if (!response.data.access_token) {
            throw new Error('Access token not received');
        }

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        console.error('Status:', error.response?.status);
        console.error('Headers:', error.response?.headers);
        throw new Error('Failed to fetch access token');
    }
}

// Initiate STK Push to Safaricom
async function initiateSTKPush(token, phoneNumber, amount) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const formattedPhoneNumber = phoneNumber.replace(/^0/, '254');

    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: generatePassword(process.env.BUSINESS_SHORT_CODE),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: formattedPhoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: formattedPhoneNumber,
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

// Register Callback URLs with Safaricom
async function registerCallbackURLs(token) {
    if (!token) {
        throw new Error('Invalid or missing access token');
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const payload = {
        ShortCode: process.env.BUSINESS_SHORT_CODE,
        ResponseType: 'Completed',
        ConfirmationURL: process.env.CONFIRMATION_URL,
        ValidationURL: process.env.VALIDATION_URL,
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

// Main handler function that coordinates the payment initiation
module.exports = async (req, res) => {
    const { phoneNumber, email } = req.body;

    if (!phoneNumber || !email) {
        return res.status(400).json({ error: 'Phone number and email are required.' });
    }

    const amount = 250; // Set fixed amount for payment

    try {
        console.log('Fetching access token...');
        const token = await getAccessToken();

        if (!token) {
            return res.status(401).json({ error: 'Invalid access token' });
        }
        console.log('Access token fetched successfully:', token);

        // Register Callback URLs (can be skipped if already done)
        await registerCallbackURLs(token);

        // Initiate STK push (this will trigger the payment process)
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment details to Firestore database
        await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'initiated',
            timestamp: new Date(),
        });

        return res.status(200).json({ message: 'Payment initiated successfully', stkResponse });
    } catch (error) {
        console.error('Error during payment process:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
