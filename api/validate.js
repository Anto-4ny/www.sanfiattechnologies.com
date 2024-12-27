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

        // Validate the request body
        if (!Body || !Body.stkCallback) {
            console.error('Invalid request body received:', req.body);
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        // Check for required fields
        if (!CheckoutRequestID || typeof ResultCode === 'undefined') {
            console.error('Missing required fields in callback:', { CheckoutRequestID, ResultCode });
            return res.status(400).json({ error: 'Missing required fields in the callback' });
        }

        // Log callback data for debugging purposes
        console.log('Received validation callback:', {
            CheckoutRequestID,
            ResultCode,
            CallbackMetadata,
        });

        // Determine validation status based on ResultCode
        const validationStatus = ResultCode === 0 ? 'Success' : 'Failed';

        // Log validation status
        console.log(`Validation status for CheckoutRequestID ${CheckoutRequestID}:`, validationStatus);

        // Prepare the response expected by Safaricom
        const validationResponse = {
            ResultCode: validationStatus === 'Success' ? 0 : 1,
            ResultDesc: validationStatus === 'Success' ? 'Validation successful' : 'Validation failed',
        };

        // Send response to Safaricom
        res.status(200).json(validationResponse);
    } catch (error) {
        // Log errors for debugging
        console.error('Error during validation processing:', error.message || error);

        // Send a failure response to Safaricom
        res.status(500).json({ error: 'Error during validation' });
    }
};
