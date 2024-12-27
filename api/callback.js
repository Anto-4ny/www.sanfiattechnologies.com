// api/callback.js

const { db } = require('./firebase-admin'); // Import Firestore instance

module.exports = async (req, res) => {
    // Check if the method is POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Step 1: Received callback:', req.body);

        // Extract necessary data from the request body
        const { Body } = req.body;
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        console.log('Step 3: Extracted stkCallback:', stkCallback);

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        // Fetch the payment record using CheckoutRequestID
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error('No payment record found for CheckoutRequestID:', CheckoutRequestID);
            console.error('Available payments in Firestore:', await db.collection('payments').get());
            return res.status(404).send('Payment record not found');
        }

        // Extract the Mpesa receipt number from CallbackMetadata
        let mpesaCode = '';
        if (CallbackMetadata?.Item) {
            mpesaCode =
                CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        const batch = db.batch();

        // Update payment status in the Firestore collection
        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();

        // Update the user's balance if the payment was successful
        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data(); // Assume one record
            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const newBalance = (userDoc.data().balance || 0) + paymentData.amount;
                await userDocRef.update({ balance: newBalance, paidRegistration: true });
                return res.status(200).json({ message: 'Payment successful', newBalance, mpesaCode });
            }
        }

        res.status(200).json({ message: 'Payment updated successfully', status });
    } catch (error) {
        console.error('Callback processing error:', error.message || error);
        res.status(500).send('Error processing callback');
    }
};
