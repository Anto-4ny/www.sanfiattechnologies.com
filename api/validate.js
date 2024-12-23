const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

module.exports = async (req, res) => {
    // Ensure only POST requests are processed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Destructure the request body
        const { Body } = req.body;

        // Check if required fields exist in the request body
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        // Ensure necessary fields are available
        if (!CheckoutRequestID || !ResultCode) {
            return res.status(400).json({ error: 'Missing required fields in the callback' });
        }

        // Optionally validate the payment request (e.g., checking phone number, amount)
        const validationStatus = ResultCode === 0 ? 'Success' : 'Failed';

        // Log for debugging purposes
        console.log('Validation received:', {
            CheckoutRequestID,
            ResultCode,
            CallbackMetadata,
        });

        // Construct the validation response that Safaricom expects
        const validationResponse = {
            ResultCode: validationStatus === 'Success' ? 0 : 1,
            ResultDesc: validationStatus === 'Success' ? 'Success' : 'Validation failed',
        };

        // Send the response to Safaricom's validation request
        res.status(200).json(validationResponse);
    } catch (error) {
        console.error('Validation error:', error.message || error);
        res.status(500).json({ error: 'Error during validation' });
    }
};
