const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env file

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Helper to get the current timestamp in the format Safaricom expects
function getCurrentTimestamp() {
    return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

// Helper to generate the password for STK push
function generatePassword(shortCode) {
    const timestamp = getCurrentTimestamp();
    const password = `${shortCode}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

// Helper to get the OAuth token for MPESA
async function getAccessToken() {
    console.log('Fetching access token...');
    console.log('Consumer Key:', process.env.LIVE_APP_CONSUMER_KEY);
    console.log('Consumer Secret:', process.env.LIVE_APP_CONSUMER_SECRET);

    try {
        const response = await axios.get(`${process.env.OAUTH_TOKEN_URL}?grant_type=client_credentials`, {
            auth: {
                username: process.env.LIVE_APP_CONSUMER_KEY,
                password: process.env.LIVE_APP_CONSUMER_SECRET,
            },
        });
        console.log('Access Token:', response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to fetch access token. Please check your credentials.');
    }
}

// Helper function to initiate the STK push
async function initiateSTKPush(token, phoneNumber, amount) {
    console.log('Initiating STK Push...');
    console.log('Token:', token);
    console.log('Phone Number:', phoneNumber);
    console.log('Amount:', amount);

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: generatePassword(process.env.BUSINESS_SHORT_CODE),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerBuyGoodsOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: phoneNumber,
        TransactionDesc: `Payment to till number ${process.env.BUSINESS_SHORT_CODE}`,
    };

    console.log('STK Push Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(process.env.STK_PUSH_URL, payload, { headers });
        console.log('STK Response:', response.data);
        return response.data;
    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        throw new Error('Failed to initiate STK push. Please check your payload and token.');
    }
}

// Main handler function
module.exports = async (req, res) => {
    const { phoneNumber, email } = req.body;

    if (!phoneNumber || !email) {
        return res.status(400).json({ error: 'Phone number and email are required.' });
    }

    const amount = 250; // Fixed amount for payment

    try {
        // Fetch access token
        const token = await getAccessToken();

        // Initiate STK push
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment details in Firestore
        const paymentDoc = await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'Pending',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID,
        });

        // Send success response
        res.status(200).json({
            message: 'Payment initiated. Please enter your MPESA PIN.',
            paymentId: paymentDoc.id,
            stkResponse,
        });
    } catch (error) {
        console.error('Error initiating payment:', error.message || error);
        res.status(500).json({ error: 'Payment initiation failed. Please try again later.' });
    }
};