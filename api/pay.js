const { db } = require('./firebase-admin'); // Import Firestore instance
const axios = require('axios');

// Helper: Get the current timestamp in Safaricom's expected format
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

// Helper: Generate the password for STK push
function generatePassword(shortCode) {
    const timestamp = getCurrentTimestamp();
    const password = `${shortCode}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

// Caching for access token
let cachedToken = null;
let tokenExpiry = null;

// Helper: Get access token
async function getAccessToken() {
    if (cachedToken && tokenExpiry > Date.now()) {
        console.log('Using cached access token.');
        return cachedToken;
    }

    try {
        console.log('Fetching new access token...');
        const authHeader = `Basic ${Buffer.from(
            `${process.env.LIVE_APP_CONSUMER_KEY}:${process.env.LIVE_APP_CONSUMER_SECRET}`
        ).toString('base64')}`;

        const response = await axios.post(
            process.env.OAUTH_TOKEN_URL,
            new URLSearchParams({ grant_type: 'client_credentials' }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: authHeader,
                },
            }
        );

        if (!response.data.access_token) {
            throw new Error('Access token not received');
        }

        // Cache the token with a buffer before expiry
        cachedToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

        console.log('Access token fetched successfully.');
        return cachedToken;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to fetch access token');
    }
}

// Helper: Initiate STK push
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
        console.log('Initiating STK push:', payload);
        const response = await axios.post(process.env.STK_PUSH_URL, payload, { headers });
        console.log('STK push response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error in STK Push:', error.response?.data || error.message);
        throw new Error('Failed to initiate STK push');
    }
}

// Helper: Register Callback URLs with Safaricom
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

        console.log('Registering callback URLs:', payload);
        const response = await axios.post('https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl', payload, { headers });

        if (response.data.ResponseCode === '0') {
            console.log('Callback URLs registered successfully:', response.data);
        } else {
            console.log('Callback URLs might already be registered:', response.data);
        }
    } catch (error) {
        console.error('Error registering callback URLs:', error.response?.data || error.message);
        throw new Error('Failed to register callback URLs');
    }
}

// Main handler: Coordinate payment initiation
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phoneNumber, email } = req.body;

    if (!phoneNumber || !email) {
        return res.status(400).json({ error: 'Phone number and email are required.' });
    }

    const amount = 250;

    try {
        const token = await getAccessToken();

        // Register Callback URLs (executed only once)
        await registerCallbackURLs(token);

        // Initiate STK push
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
        console.error('Error during payment process:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Callback handler for Safaricom
module.exports.callback = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { Body } = req.body;

        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            return res.status(404).json({ error: 'Payment record not found' });
        }

        let mpesaCode = '';
        if (CallbackMetadata?.Item) {
            mpesaCode =
                CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        const batch = db.batch();

        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();

        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data();
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
        console.error('Callback processing error:', error.message);
        res.status(500).send('Error processing callback');
    }
};
