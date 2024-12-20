const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

module.exports = async (req, res) => {
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

        // Optionally perform validation on the incoming payment request
        // For example, you can check if the phone number matches a user or if the amount is correct
        const validationStatus = ResultCode === 0 ? 'Success' : 'Failed';

        // Respond with validation response expected by Safaricom
        const validationResponse = {
            ResultCode: validationStatus === 'Success' ? 0 : 1,
            ResultDesc: validationStatus === 'Success' ? 'Success' : 'Validation failed',
        };

        res.status(200).json(validationResponse);
    } catch (error) {
        console.error('Validation error:', error.message || error);
        res.status(500).json({ error: 'Error during validation' });
    }
};
