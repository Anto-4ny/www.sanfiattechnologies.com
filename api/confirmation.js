const { db } = require('./firebase-admin'); // Import Firestore instance

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed, only POST is allowed' });
    }

    try {
        const { Body } = req.body;

        if (!Body) {
            return res.status(400).json({ error: 'Missing required data in request body' });
        }

        // Log the full callback data for debugging purposes
        console.log('Received M-PESA Callback:', JSON.stringify(Body, null, 2));

        // Extract callback data
        const callback = Body.stkCallback;
        const CheckoutRequestID = callback.CheckoutRequestID;
        const ResultCode = callback.ResultCode;
        const ResultDesc = callback.ResultDesc;

        // Safeguard against potential undefined/empty CallbackMetadata
        const MpesaReceiptNumber = callback.CallbackMetadata?.Item.find(
            (item) => item.Name === 'MpesaReceiptNumber'
        )?.Value || ''; // If no receipt number, set as empty string

        if (!CheckoutRequestID || ResultCode === undefined) {
            return res.status(400).json({ error: 'Missing required parameters in callback data' });
        }

        // Find the payment record in Firestore
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            return res.status(404).json({ error: 'Payment record not found' });
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        const failureDetails = ResultCode !== 0 ? { code: ResultCode, description: ResultDesc } : null;

        console.log(failureDetails ? `Payment failed with error: ${JSON.stringify(failureDetails)}` : 'Payment successful');

        // Update the payment record in Firestore
        const batch = db.batch();
        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode: MpesaReceiptNumber });
        });

        await batch.commit();

        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data();
            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const newBalance = (userDoc.data().balance || 0) + paymentData.amount;
                await userDocRef.update({ balance: newBalance, paidRegistration: true });

                // Send success response back with updated balance and receipt number
                return res.status(200).json({ 
                    message: 'Payment successful', 
                    newBalance, 
                    mpesaCode: MpesaReceiptNumber 
                });
            } else {
                console.error('User not found in database:', paymentData.email);
                return res.status(404).json({ error: 'User not found for payment' });
            }
        }

        res.status(200).json({ message: 'Payment status updated', status });
    } catch (error) {
        console.error('Error processing confirmation callback:', error.message);
        res.status(500).json({ error: 'Error processing confirmation callback' });
    }
};
