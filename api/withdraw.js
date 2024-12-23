const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Helper function to get current timestamp in Safaricom format
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

// Helper function to generate password for the withdrawal request
function generatePassword(shortCode) {
    const timestamp = getCurrentTimestamp();
    const password = `${shortCode}${process.env.LIVE_APP_PASSKEY}${timestamp}`;
    return Buffer.from(password).toString('base64');
}

// Helper function to initiate withdrawal
async function initiateWithdrawal(token, phoneNumber, amount) {
    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: generatePassword(process.env.BUSINESS_SHORT_CODE),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerWithdrawFunds',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: phoneNumber,
        TransactionDesc: `Withdrawal from till number ${process.env.BUSINESS_SHORT_CODE}`,
    };

    try {
        const response = await axios.post(process.env.WITHDRAWAL_URL, payload, { headers });
        console.log("Withdrawal Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Withdrawal Error:", error.response ? error.response.data : error.message);
        throw new Error('Failed to initiate withdrawal');
    }
}

module.exports = async (req, res) => {
    const { email, phoneNumber, amount } = req.body;

    try {
        // Only allow withdrawals on Fridays (Day 5 in JavaScript Date)
        const today = new Date();
        const dayOfWeek = today.getDay();

        if (dayOfWeek !== 5) { // Allow withdrawals only on Fridays
            return res.status(400).json({ error: 'Withdrawals can only be made on Fridays.' });
        }

        // Fetch user details from Firestore
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        // Check if user has sufficient balance for withdrawal
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }

        // Update the user's balance
        const newBalance = currentBalance - amount;
        await db.collection('users').doc(email).update({ balance: newBalance });

        // Fetch MPESA access token
        const token = await getAccessToken();

        // Initiate the withdrawal request to MPESA
        const withdrawalResponse = await initiateWithdrawal(token, phoneNumber, amount);

        // Save the withdrawal request to Firestore for tracking
        await db.collection('withdrawals').add({
            email,
            phoneNumber,
            amount,
            status: 'Pending',
            mpesaTransactionID: withdrawalResponse.ConversationID,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Return the success response with withdrawal details
        return res.status(200).json({
            message: 'Withdrawal initiated. Please wait for confirmation.',
            withdrawalResponse,
        });
    } catch (error) {
        console.error('Error initiating withdrawal:', error.message || error);
        return res.status(500).json({ error: 'Failed to initiate withdrawal.' });
    }
};

// Helper function to get the access token for MPESA
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
        console.error('Error fetching access token:', error.message || error);
        throw new Error('Failed to fetch access token');
    }
}
