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
        const { data } = await axios.get(
            `${process.env.OAUTH_TOKEN_URL}?grant_type=client_credentials`,
            {
                auth: {
                    username: process.env.LIVE_APP_CONSUMER_KEY,
                    password: process.env.LIVE_APP_CONSUMER_SECRET,
                },
            }
        );
        return data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to fetch access token');
    }
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
        return response.data;
    } catch (error) {
        console.error('Error in STK Push:', error.response?.data || error.message);
        throw new Error('Failed to initiate STK push');
    }
}

function generatePassword(shortCode) {
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const password = `${shortCode}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

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

        // Register Callback URLs (make sure they are registered before proceeding)
        await registerCallbackURLs(token);

        // Initiate STK push
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment details in Firestore
        const paymentData = {
            phoneNumber,
            email,
            amount,
            status: 'Pending',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID || '',
            mpesaCode: '', // Will be updated on callback
        };

        const paymentDocRef = await db.collection('payments').add(paymentData);

        res.status(200).json({
            message: 'Payment initiated. Please enter your MPESA PIN.',
            paymentId: paymentDocRef.id,
            stkResponse,
        });
    } catch (error) {
        console.error('Error initiating payment:', error.message || error);
        res.status(500).json({ error: 'Payment initiation failed. Please try again.' });
    }
};
