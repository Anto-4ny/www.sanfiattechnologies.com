const { db } = require('./firebase-admin'); // Import Firestore instance

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

        // Fetch the payment record based on the CheckoutRequestID to validate
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error('Payment record not found for CheckoutRequestID:', CheckoutRequestID);
            return res.status(404).send('Payment record not found');
        }

        // Logic to validate transaction before confirmation
        const status = ResultCode === 0 ? 'Success' : 'Failed';
        let validationResult = { ResultCode, ResultDesc: 'Validation failed' };

        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data();
            const expectedAmount = paymentData.amount;
            const receivedAmount = CallbackMetadata?.Item?.find((item) => item.Name === 'Amount')?.Value;

            // Check if the amounts match
            if (expectedAmount === receivedAmount) {
                validationResult = { ResultCode: 0, ResultDesc: 'Validation successful' };
            } else {
                validationResult = { ResultCode: 1032, ResultDesc: 'Amount mismatch' };
            }
        }

        console.log('Validation result:', validationResult);
        res.status(200).json(validationResult); // Return validation response to Safaricom
    } catch (error) {
        console.error('Error processing validation:', error.message);
        res.status(500).send('Error processing validation');
    }
};
