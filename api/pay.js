const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Helper function to initiate the STK push
async function initiateSTKPush(token, phoneNumber, amount) {
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

    try {
        const response = await axios.post(process.env.STK_PUSH_URL, payload, { headers });
        console.log("STK Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("STK Push Error:", error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = async (req, res) => {
    const { phoneNumber, email } = req.body;
    const amount = 250; // Fixed amount for payment

    try {
        const token = await getAccessToken(); // Get OAuth token
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment status as "Pending" in Firestore
        const paymentDoc = await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'Pending',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID,
        });

        res.status(200).json({
            message: 'Payment initiated. Please enter your MPESA PIN.',
            paymentId: paymentDoc.id,
            stkResponse,
        });
    } catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: 'Payment initiation failed.' });
    }
};

// Helper to get the access token for MPESA
async function getAccessToken() {
    try {
        const response = await axios.get(`${process.env.OAUTH_TOKEN_URL}?grant_type=client_credentials`, {
            auth: {
                username: process.env.LIVE_APP_CONSUMER_KEY,
                password: process.env.LIVE_APP_CONSUMER_SECRET,
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error);
        throw error;
    }
}
