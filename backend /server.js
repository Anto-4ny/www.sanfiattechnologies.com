const axios = require('axios');
const firebase = require("firebase-admin");

// Initialize Firebase
firebase.initializeApp({
  credential: firebase.credential.applicationDefault(),
  databaseURL: "https://your-firebase-url.firebaseio.com"
});

const db = firebase.firestore();

// Daraja API credentials
const consumerKey = 'yourConsumerKey';
const consumerSecret = 'yourConsumerSecret';
const shortCode = 'yourCooperativeBankPaybill'; // Paybill account number
const passkey = 'yourPassKey'; 
const callbackURL = 'https://your-server-url/callback'; // Your backend callback URL

// Function to generate access token
async function getAccessToken() {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${auth}`
        }
    });
    return response.data.access_token;
}

// Function to trigger MPESA STK Push
async function initiateSTKPush(phoneNumber, amount) {
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

    const requestBody = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackURL,
        AccountReference: "Payment",
        TransactionDesc: "Payment for Services"
    };

    const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        requestBody,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );

    return response.data;
}

// Handle payment initiation
app.post('/pay', async (req, res) => {
    const { phoneNumber } = req.body;
    const amount = 250; // The amount to pay

    try {
        const result = await initiateSTKPush(phoneNumber, amount);
        res.status(200).json({ success: true, message: 'Payment initiated. Enter your MPESA PIN.' });
    } catch (error) {
        console.error('Payment initiation failed:', error);
        res.status(500).json({ success: false, message: 'Payment initiation failed' });
    }
});

// Callback to handle the response from MPESA
app.post('/callback', (req, res) => {
    const paymentData = req.body.Body.stkCallback;
    const phoneNumber = paymentData.CallbackMetadata.Item[4].Value;
    const mpesaCode = paymentData.CallbackMetadata.Item[1].Value;

    // Save payment data to Firestore
    db.collection('payments').add({
        phoneNumber: phoneNumber,
        mpesaCode: mpesaCode,
        amount: 250,
        status: "Waiting for Confirmation",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        res.status(200).send("Payment recorded");
    }).catch((error) => {
        console.error("Error saving payment:", error);
        res.status(500).send("Error saving payment");
    });
});
