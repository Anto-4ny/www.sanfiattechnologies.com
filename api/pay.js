const { db } = require('./firebase-admin');
const axios = require('axios');

// Helper: Get current timestamp in Safaricom's expected format
function getCurrentTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

// Helper: Generate STK push password
function generatePassword(shortCode) {
    const timestamp = getCurrentTimestamp();
    const password = `${shortCode}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

// Cached token management
let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
    if (cachedToken && tokenExpiry > Date.now()) {
        return cachedToken;
    }

    const authHeader = `Basic ${Buffer.from(`${process.env.LIVE_APP_CONSUMER_KEY}:${process.env.LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;
    const oauthUrl = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"; // Replace if different
    console.log("Requesting token from:", oauthUrl);
    const response = await axios.post(
        oauthUrl,
        new URLSearchParams({ grant_type: 'client_credentials' }),
        { headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedToken;
}

// Initiate STK push
async function initiateSTKPush(token, phoneNumber, amount) {
    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: generatePassword(process.env.BUSINESS_SHORT_CODE),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: phoneNumber,
        TransactionDesc: `Payment to ${process.env.BUSINESS_SHORT_CODE}`,
    };

    const response = await axios.post(process.env.STK_PUSH_URL, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    return response.data;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phoneNumber, email, amount } = req.body;

    if (!phoneNumber || !email || !amount) {
        return res.status(400).json({ error: 'Phone number, email, and amount are required.' });
    }

    try {
        const token = await getAccessToken();
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment record in Firestore
        await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'initiated',
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID,
            timestamp: new Date(),
        });

        res.status(200).json({ message: 'Payment initiated successfully', stkResponse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
