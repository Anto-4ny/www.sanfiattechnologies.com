// Backend (api/pay.js)
const { db } = require('./firebase-admin');
const axios = require('axios');

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

let cachedToken = null;
let tokenExpiry = null;

// Helper function to get access token
async function getAccessToken() {
    try {
        // Check if token is cached and still valid
        if (cachedToken && tokenExpiry > Date.now()) {
            console.log('Using cached access token.');
            return cachedToken;
        }

        // Construct Basic Authorization header
        const authHeader = `Basic ${Buffer.from(`${process.env.LIVE_APP_CONSUMER_KEY}:${process.env.LIVE_APP_CONSUMER_SECRET}`).toString('base64')}`;

        const response = await axios.post(
            process.env.OAUTH_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authHeader,
                },
            }
        );

        console.log('Access Token Response:', response.data);

        if (!response.data.access_token) {
            throw new Error('Access token not received');
        }

        cachedToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Token expiry minus 60 seconds buffer
        return cachedToken;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        if (error.response) {
            console.error('Full error response:', error.response.data);
        }
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

// Register Callback URLs with Safaricom (only if not already registered)
async function registerCallbackURLs(token) {
    try {
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

        const response = await axios.post('https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl', payload, { headers });

        // Check if the response indicates success in registering the URLs
        if (response.data && response.data.ResponseCode === '0') {
            console.log('Callback URLs registered successfully:', response.data);
        } else {
            console.log('Callback URLs might already be registered or encountered an issue:', response.data);
        }

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
    // Check if the method is POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        // Register Callback URLs (only if not registered)
        await registerCallbackURLs(token);

        // Initiate STK push (this will trigger the payment process)
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Save payment details to Firestore database
        await db.collection('payments').add({
            email,
            phoneNumber,
            amount,
            status: 'initiated',
            mpesaCheckoutRequestID: stkResponse.CheckoutRequestID,
            timestamp: new Date(),
        });

        return res.status(200).json({ message: 'Payment initiated successfully', stkResponse });
    } catch (error) {
        console.error('Error during payment process:', error.message);
        return res.status(500).json({ error: error.message });
    }
};

// Callback handler for Safaricom
module.exports.callback = async (req, res) => {
    // Check if the method is POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Step 1: Received callback:', req.body);

        // Extract necessary data from the request body
        const { Body } = req.body;
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        console.log('Step 3: Extracted stkCallback:', stkCallback);

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        // Fetch the payment record using CheckoutRequestID
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error('No payment record found for CheckoutRequestID:', CheckoutRequestID);
            console.error('Available payments in Firestore:', await db.collection('payments').get());
            return res.status(404).send('Payment record not found');
        }

        // Extract the Mpesa receipt number from CallbackMetadata
        let mpesaCode = '';
        if (CallbackMetadata?.Item) {
            mpesaCode =
                CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        const batch = db.batch();

        // Update payment status in the Firestore collection
        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();

        // Update the user's balance if the payment was successful
        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data(); // Assume one record
            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const newBalance = (userDoc.data().balance || 0) + paymentData.amount;
                await userDocRef.update({ balance: newBalance, paidRegistration: true });
                return res.status(200).json({ message: 'Payment successful', newBalance, mpesaCode });
            }
        }

        res.status(200).json({ message: 'Payment updated successfully', status });
    } catch (error) {
        console.error('Callback processing error:', error.message || error);
        res.status(500).send('Error processing callback');
    }
};
