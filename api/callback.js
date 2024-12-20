const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}
const db = admin.firestore();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { Body } = req.body;

        // Ensure required body fields are present
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid request body - stkCallback is missing' });
        }

        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        // Ensure CheckoutRequestID and ResultCode are present
        if (!CheckoutRequestID || ResultCode === undefined) {
            return res.status(400).json({ error: 'CheckoutRequestID or ResultCode missing' });
        }

        // Fetch payment record
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error(`No payment record found for CheckoutRequestID: ${CheckoutRequestID}`);
            return res.status(404).json({ error: 'Payment record not found' });
        }

        let mpesaCode = '';
        if (CallbackMetadata?.Item) {
            mpesaCode =
                CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        const batch = db.batch();

        // Update payment record status in Firestore
        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();

        // If payment was successful, update user's balance
        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data(); // Assume one record
            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const newBalance = (userDoc.data().balance || 0) + paymentData.amount;
                await userDocRef.update({ balance: newBalance, paidRegistration: true });
                return res.status(200).json({
                    message: 'Payment successful',
                    newBalance,
                    mpesaCode,
                    status,
                });
            } else {
                console.error(`User not found for email: ${paymentData.email}`);
                return res.status(404).json({ error: 'User not found' });
            }
        }

        res.status(200).json({ message: 'Payment updated successfully', status });
    } catch (error) {
        console.error('Callback processing error:', error.message || error);
        res.status(500).json({
            error: 'Error processing callback',
            details: error.message || error,
        });
    }
};
