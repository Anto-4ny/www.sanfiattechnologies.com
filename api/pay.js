require('dotenv').config(); // Load environment variables from .env file
const axios = require('axios');
const { db } = require('./firebase-admin'); // Import Firestore instance

// Helper: Get current timestamp in Safaricom's expected format
function getCurrentTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

// Helper: Generate STK push password
function generatePassword() {
    const timestamp = getCurrentTimestamp();
    const password = `${process.env.BUSINESS_SHORT_CODE}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

// Cached token management
let cachedToken = null;
let tokenExpiry = null;

// Function: Get access token
async function getAccessToken() {
    if (cachedToken && tokenExpiry > Date.now()) {
        return cachedToken;
    }

    const authHeader = `Basic ${Buffer.from(`${process.env.LIVE_APP_CONSUMER_KEY}:${process.env.LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    const oauthUrl = `https://api.safaricom.co.ke/oauth/v2/generate?grant_type=client_credentials`;

    try {
        const response = await axios.get(oauthUrl, {
            headers: { Authorization: authHeader },
        });

        cachedToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Cache token with a buffer of 60 seconds
        return cachedToken;
    } catch (error) {
        console.error('Error fetching access token:', error.message); // Log only error message in production
        throw new Error('Failed to fetch access token.');
    }
}

// Function: Initiate STK push
async function initiateSTKPush(token, phoneNumber, amount) {
    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,  // Use the actual parent shortcode (e.g., 5467572)
        Password: generatePassword(),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerBuyGoodsOnline', // Correct TransactionType for Till Numbers
        Amount: amount,
        PartyA: phoneNumber, // Customer phone number
        PartyB: process.env.TILL_NUMBER, // Till Number (child shortcode or actual till number)
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL, // Your callback URL
        AccountReference: `Ref-${phoneNumber}`, // Reference for the transaction
        TransactionDesc: `Payment to ${process.env.TILL_NUMBER}`, // Description of the transaction
    };

    try {
        const response = await axios.post(process.env.STK_PUSH_URL, payload, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        return response.data;
    } catch (error) {
        console.error('Error initiating STK Push:', error.message); // Log only error message in production
        throw new Error('Failed to initiate STK Push.');
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed, only POST is allowed' });
    }

    // Ensure req.body exists and has required fields
    const { phoneNumber, email, amount } = req.body || {}; // Destructure safely

    if (!phoneNumber || !email || !amount) {
        return res.status(400).json({ error: 'Phone number, email, and amount are required.' });
    }

    try {
        const token = await getAccessToken();
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment record in Firestore (Make sure `db` is initialized and working)
        await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'initiated',
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID,
            timestamp: new Date(),
        });

        // Send the BUSINESS_SHORT_CODE along with the response data
        res.status(200).json({
            message: 'Payment initiated successfully',
            stkResponse,
            businessShortCode: process.env.BUSINESS_SHORT_CODE, // Include BUSINESS_SHORT_CODE in the response
        });
    } catch (error) {
        // Log errors with specific messages but avoid too much detail for production
        console.error('Error initiating payment:', error.message); // Log only error message
        res.status(500).json({ error: 'Failed to initiate payment. Please try again later.' });
    }
};
