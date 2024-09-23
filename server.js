const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDK setup
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://antocap-referrals.firebaseio.com'
});

const db = admin.firestore();

// Middleware to parse incoming JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Route to serve deposit.html directly from the root directory
app.get('/deposit', (req, res) => {
    res.sendFile(path.join(__dirname, 'deposit.html'));
});

// MPESA STK Push API endpoint
app.post('/api/pay', async (req, res) => {
    const { phoneNumber } = req.body;
    const amount = 250; // Amount to be paid

    try {
        const token = await getAccessToken();
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Add initial payment status to Firestore as pending
        const paymentDoc = await db.collection('payments').add({
            phoneNumber,
            amount,
            status: 'Pending',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID // Save CheckoutRequestID to track later
        });

        res.status(200).json({
            message: 'Payment initiated. Please enter your MPESA PIN.',
            paymentId: paymentDoc.id,
            stkResponse
        });
    } catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: 'Payment initiation failed.' });
    }
});

// MPESA Callback handler
app.post('/api/callback', async (req, res) => {
    const { Body } = req.body;
    const { stkCallback } = Body;

    if (stkCallback && stkCallback.ResultCode !== undefined) {
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        try {
            // Find and update the payment using the CheckoutRequestID
            const paymentRef = await db.collection('payments')
                .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
                .get();

            if (!paymentRef.empty) {
                // Extract MPESA transaction details (e.g., transaction code)
                let mpesaCode = '';
                if (CallbackMetadata && CallbackMetadata.Item) {
                    mpesaCode = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber')?.Value || '';
                }

                paymentRef.forEach(async (doc) => {
                    await db.collection('payments').doc(doc.id).update({
                        status: ResultCode === 0 ? 'Success' : 'Failed', // ResultCode 0 means success
                        mpesaCode: mpesaCode || 'N/A'
                    });
                });

                res.status(200).send('Callback processed successfully');
            } else {
                console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
                res.status(404).send('Payment not found');
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            res.status(500).send('Failed to process callback');
        }
    } else {
        console.error('Invalid callback data received');
        res.status(400).send('Invalid callback data');
    }
});

// Function to get MPESA access token
async function getAccessToken() {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');

    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${auth}`
        }
    });

    return response.data.access_token;
}

// Function to initiate MPESA STK Push
async function initiateSTKPush(token, phoneNumber, amount) {
    const payload = {
        BusinessShortCode: '400200', // Replace with your shortcode
        Password: createMpesaPassword(), // Password created using Shortcode and passkey
        Timestamp: getCurrentTimestamp(), // Current timestamp in yyyymmddhhmmss
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: '400200', // Business shortcode
        PhoneNumber: phoneNumber,
        CallBackURL: 'https://your-domain.com/api/callback',
        AccountReference: '860211', // Paybill account number or unique identifier
        TransactionDesc: 'Payment for services'
    };

    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
}

// Utility function to create the MPESA password
function createMpesaPassword() {
    const shortcode = '400200'; // Replace with your business shortcode
    const passkey = process.env.MPESA_PASSKEY; // From MPESA developer portal
    const timestamp = getCurrentTimestamp();
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    return password;
}

// Utility function to get the current timestamp
function getCurrentTimestamp() {
    const now = new Date();
    return now.getFullYear() + 
           ('0' + (now.getMonth() + 1)).slice(-2) + 
           ('0' + now.getDate()).slice(-2) + 
           ('0' + now.getHours()).slice(-2) + 
           ('0' + now.getMinutes()).slice(-2) + 
           ('0' + now.getSeconds()).slice(-2);
}

// Endpoint to update payment with MPESA transaction code manually
app.post('/api/payments/:paymentId/update', async (req, res) => {
    const { paymentId } = req.params;
    const { mpesaCode } = req.body;

    try {
        const paymentRef = db.collection('payments').doc(paymentId);
        await paymentRef.update({
            mpesaCode: mpesaCode,
            status: 'Waiting for Confirmation'
        });

        res.status(200).json({ message: 'Payment updated successfully.' });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
                             
