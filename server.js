const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating unique referral codes
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

// Route to serve withdrawal.html
app.get('/withdrawal', (req, res) => {
    res.sendFile(path.join(__dirname, 'withdrawal.html'));
});

// Route to serve registration.html
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'registration.html'));
});

// Referral link generation for new users
app.post('/api/register', async (req, res) => {
    const { phoneNumber, email, referralCode } = req.body;

    try {
        // Check if a user already exists
        const userDoc = await db.collection('users').doc(email).get();
        if (userDoc.exists) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        // Generate a unique referral link for the new user
        const userReferralCode = uuidv4(); // Generate a unique referral code

        // Save the new user along with their referral code
        await db.collection('users').doc(email).set({
            phoneNumber,
            email,
            referralCode: userReferralCode,
            referredBy: referralCode || null, // Save the referral code if it was used
            balance: 0,
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            paidRegistration: false
        });

        // If a referral code was used, record the referral
        if (referralCode) {
            const referrer = await db.collection('users')
                .where('referralCode', '==', referralCode)
                .limit(1)
                .get();

            if (!referrer.empty) {
                const referrerDoc = referrer.docs[0];
                await db.collection('users').doc(referrerDoc.id).update({
                    referredUsers: admin.firestore.FieldValue.arrayUnion(email)
                });
            }
        }

        res.status(200).json({
            message: 'User registered successfully.',
            referralLink: `https://your-domain.com/register?referralCode=${userReferralCode}`
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user.' });
    }
});

// Fetch referred users for a specific user
app.get('/api/referrals/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = userDoc.data();
        if (!userData.referredUsers || userData.referredUsers.length === 0) {
            return res.status(200).json({ message: 'No referrals yet.', referrals: [] });
        }

        // Fetch referred users' details
        const referralPromises = userData.referredUsers.map(refEmail => db.collection('users').doc(refEmail).get());
        const referralDocs = await Promise.all(referralPromises);

        const referrals = referralDocs.map(doc => {
            const refData = doc.data();
            return {
                email: doc.id,
                phoneNumber: refData.phoneNumber,
                paidRegistration: refData.paidRegistration
            };
        });

        res.status(200).json({ referrals });
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referrals.' });
    }
});


// Function to initiate the MPESA STK Push request using Till Number
async function initiateSTKPush(token, phoneNumber, amount) {
    const businessShortCode = '860211'; // Your Till Number

    const url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'; // Use live URL for production

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const payload = {
        BusinessShortCode: businessShortCode, // Till Number
        Password: generatePassword(businessShortCode),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerBuyGoodsOnline', // For Till Number transactions
        Amount: amount,
        PartyA: phoneNumber, // The customer's phone number
        PartyB: businessShortCode, // Till Number
        PhoneNumber: phoneNumber,
        CallBackURL: 'https://yourdomain.com/api/callback', // Replace with your actual callback URL
        AccountReference: phoneNumber, // You can use the phone number or any other reference
        TransactionDesc: `Payment to till number ${businessShortCode}` // Optional description
    };

    const response = await axios.post(url, payload, { headers });
    return response.data;
}



// MPESA STK Push API endpoint for deposits
app.post('/api/pay', async (req, res) => {
    const { phoneNumber, email } = req.body;
    const amount = 250; // Amount to be paid

    try {
        const token = await getAccessToken(); // Function to get OAuth token
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

        // Add initial payment status to Firestore as pending
        const paymentDoc = await db.collection('payments').add({
            email,
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


// MPESA Callback handler for deposits
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

                    if (ResultCode === 0) {
                        // Mark the user as having paid registration fee
                        const paymentData = doc.data();
                        await db.collection('users').doc(paymentData.email).update({
                            paidRegistration: true
                        });
                    }
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


// MPESA Withdrawal Request
app.post('/api/withdraw', async (req, res) => {
    const { email, phoneNumber, amount } = req.body;

    try {
        // Check if today is Friday
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday

        if (dayOfWeek !== 5) { // 5 means Friday
            return res.status(400).json({ error: 'Withdrawals can only be made on Fridays.' });
        }

        // Fetch user balance
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        // Check if the user has enough balance to withdraw
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }

        // Deduct the amount from the user's balance
        const newBalance = currentBalance - amount;
        await db.collection('users').doc(email).update({
            balance: newBalance
        });

        // Process the MPESA withdrawal (simulated for sandbox environment)
        const token = await getAccessToken();
        const withdrawalResponse = await initiateWithdrawal(token, phoneNumber, amount);

        // Save the withdrawal transaction in Firestore
        await db.collection('withdrawals').add({
            email,
            phoneNumber,
            amount,
            status: 'Pending',
            mpesaTransactionID: withdrawalResponse.ConversationID,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({
            message: 'Withdrawal initiated. Please wait for confirmation.',
            withdrawalResponse
        });
    } catch (error) {
        console.error('Error initiating withdrawal:', error);
        res.status(500).json({ error: 'Failed to initiate withdrawal.' });
    }
});

// Function to initiate MPESA Withdrawal (B2C Request)
async function initiateWithdrawal(token, phoneNumber, amount) {
    const payload = {
        InitiatorName: process.env.INITIATOR_NAME,
        SecurityCredential: process.env.SECURITY_CREDENTIAL,
        CommandID: 'BusinessPayment',
        Amount: amount,
        PartyA: '860211', // Till number for withdrawal
        PartyB: phoneNumber,
        Remarks: 'Withdrawal',
        QueueTimeOutURL: 'https://your-domain.com/callback', // Replace with your callback URL
        ResultURL: 'https://your-domain.com/callback', // Replace with your callback URL
        Occasion: 'Withdrawal'
    };

    const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest', payload, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
}



// Function to get MPESA access token
async function getAccessToken() {
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        auth: {
            username: process.env.LIVE_APP_CONSUMER_KEY,
            password: process.env.LIVE_APP_CONSUMER_SECRET
        }
    });
    return response.data.access_token;
}

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
