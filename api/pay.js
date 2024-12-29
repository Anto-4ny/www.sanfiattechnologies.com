const { db } = require('./firebase-admin');
const axios = require('axios');

async function initiateSTKPush(token, phoneNumber, amount) {
    const payload = {
        BusinessShortCode: process.env.BUSINESS_SHORT_CODE,
        Password: generatePassword(process.env.BUSINESS_SHORT_CODE),
        Timestamp: getCurrentTimestamp(),
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: process.env.BUSINESS_SHORT_CODE,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: phoneNumber,
        TransactionDesc: `Payment to ${process.env.BUSINESS_SHORT_CODE}`,
    };

    try {
        const response = await axios.post(process.env.STK_PUSH_URL, payload, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        return response.data;
    } catch (error) {
        console.error('Error initiating STK Push:', error.response?.data || error.message);
        throw new Error('Failed to initiate STK Push.');
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phoneNumber, email, amount } = req.query;

    if (!phoneNumber || !email || !amount) {
        return res.status(400).json({ error: 'Phone number, email, and amount are required.' });
    }

    try {
        const token = await getAccessToken();
        const stkResponse = await initiateSTKPush(token, phoneNumber, amount);

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
        res.status(500).json({ error: error.message });
    }
};
