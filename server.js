const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const admin = require('firebase-admin');
const path = require('path');
const app = express();
const { v4: uuidv4 } = require('uuid'); // To generate unique referral codes
require('dotenv').config();
app.use(bodyParser.json());
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

// MPESA STK Push API endpoint for deposits
app.post('/api/pay', async (req, res) => {
    const { phoneNumber, email } = req.body;
    const amount = 250; // Amount to be paid

    try {
        const token = await getAccessToken();
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
        PartyA: '400200', // Replace with your shortcode
        PartyB: phoneNumber,
        Remarks: 'Withdrawal',
        QueueTimeOutURL: 'https://anto-4ny.github.io/www.sanfiattechnologies.com/api/withdrawal-timeout',
        ResultURL: 'https://anto-4ny.github.io/www.sanfiattechnologies.com/api/withdrawal-result',
        Occasion: 'Withdrawal'
    };

    const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
        payload,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
}

// Function to get MPESA access token
async function getAccessToken() {
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        auth: {
            username: process.env.CONSUMER_KEY,
            password: process.env.CONSUMER_SECRET
        }
    });
    return response.data.access_token;
}

// Function to initiate MPESA STK Push
async function initiateSTKPush(token, phoneNumber, amount) {
    const timestamp = generateTimestamp();
    const password = Buffer.from(`${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`).toString('base64');

    const payload = {
        BusinessShortCode: process.env.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.SHORTCODE,
        PhoneNumber: phoneNumber,
        CallBackURL: 'https://your-domain.com/api/callback',
        AccountReference: 'Referrals Program',
        TransactionDesc: 'Payment for registration'
    };

    const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        payload,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
}

// Generate timestamp for MPESA transactions
function generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}


// Function to add notifications
async function addNotification(userId, message) {
    const notificationsRef = usersRef.doc(userId).collection('notifications');
    await notificationsRef.add({
        message: message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Example notification function (can be adjusted for UI)
function showNotification(message) {
    const notificationBar = document.getElementById('notification-bar');
    notificationBar.textContent = message;
    notificationBar.style.display = 'block';
    }



// Route to initiate MPESA payment (STK push)
app.post('/initiate-payment', async (req, res) => {
    const { phoneNumber, amount } = req.body;

    try {
        // Get access token for MPESA API (replace with your own token fetch method)
        const { data: { access_token } } = await axios({
            method: 'GET',
            url: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            headers: {
                'Authorization': `Basic ${Buffer.from('YOUR_CONSUMER_KEY:YOUR_CONSUMER_SECRET').toString('base64')}`
            }
        });

        // Prepare MPESA STK push request
        const stkPushData = {
            BusinessShortCode: 400200, // Your Paybill
            Password: "GeneratedPassword", // Base64-encoded of the shortcode, passkey, and timestamp
            Timestamp: new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14),
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: 400200, // Paybill
            PhoneNumber: phoneNumber,
            CallBackURL: "https://your-website.com/mpesa-callback", // Your callback URL
            AccountReference: "860211", // Account number
            TransactionDesc: "Activation Payment"
        };

        // Make STK push request
        const { data } = await axios({
            method: 'POST',
            url: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            data: stkPushData
        });

        if (data.ResponseCode === "0") {
            res.status(200).json({ success: true, message: 'STK push sent' });
        } else {
            res.status(400).json({ success: false, message: data.errorMessage });
        }
    } catch (error) {
        console.error("Error initiating MPESA payment: ", error);
        res.status(500).json({ success: false, message: 'Failed to initiate payment' });
    }
});

// MPESA Callback URL to confirm the payment
app.post('/mpesa-callback', (req, res) => {
    const transactionData = req.body.Body.stkCallback;

    if (transactionData.ResultCode === 0) {
        const transactionId = transactionData.CallbackMetadata.Item[1].Value;
        const phoneNumber = transactionData.CallbackMetadata.Item[4].Value;
        const amount = transactionData.CallbackMetadata.Item[0].Value;

        // TODO: Save the payment info to Firestore or your database
        console.log(`Transaction successful: ${transactionId} - Phone: ${phoneNumber} - Amount: ${amount}`);

        // Send success response
        res.status(200).json({ success: true, message: 'Payment successful' });
    } else {
        console.log(`Transaction failed: ${transactionData.ResultDesc}`);
        res.status(400).json({ success: false, message: transactionData.ResultDesc });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

