const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

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
        throw error;
    }
}

module.exports = async (req, res) => {
    const { email, phoneNumber, amount } = req.body;

    try {
        const today = new Date();
        const dayOfWeek = today.getDay();

        if (dayOfWeek !== 5) { // Allow withdrawals only on Fridays
            return res.status(400).json({ error: 'Withdrawals can only be made on Fridays.' });
        }

        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }

        const newBalance = currentBalance - amount;
        await db.collection('users').doc(email).update({ balance: newBalance });

        const token = await getAccessToken();
        const withdrawalResponse = await initiateWithdrawal(token, phoneNumber, amount);

        await db.collection('withdrawals').add({
            email,
            phoneNumber,
            amount,
            status: 'Pending',
            mpesaTransactionID: withdrawalResponse.ConversationID,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
            message: 'Withdrawal initiated. Please wait for confirmation.',
            withdrawalResponse,
        });
    } catch (error) {
        console.error('Error initiating withdrawal:', error);
        res.status(500).json({ error: 'Failed to initiate withdrawal.' });
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
