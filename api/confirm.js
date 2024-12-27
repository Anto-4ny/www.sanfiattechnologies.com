const { db } = require('./firebase-admin'); // Import Firestore instance

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { Body } = req.body;

        if (!Body || !Body.stkCallback) {
            console.error('Invalid callback body:', req.body);
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        console.log('Received callback for CheckoutRequestID:', CheckoutRequestID);

        // Fetch payment record based on CheckoutRequestID
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error('No payment record found for CheckoutRequestID:', CheckoutRequestID);
            return res.status(404).json({ error: 'Payment record not found' });
        }

        let mpesaCode = '';
        if (CallbackMetadata?.Item) {
            mpesaCode = CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        const batch = db.batch();

        console.log(`Updating payment status to ${status} for CheckoutRequestID:`, CheckoutRequestID);

        // Update payment status in the Firestore collection
        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();

        if (status === 'Success') {
            console.log('Payment successful. Updating user balance...');
            const paymentData = paymentRef.docs[0].data(); // Assuming one record per CheckoutRequestID
            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const currentBalance = userDoc.data().balance || 0;
                const newBalance = currentBalance + paymentData.amount;

                await userDocRef.update({
                    balance: newBalance,
                    paidRegistration: true,
                });

                console.log(`User balance updated successfully for email: ${paymentData.email}`);
                return res.status(200).json({
                    message: 'Payment successful',
                    newBalance,
                    mpesaCode,
                });
            } else {
                console.warn(`User document not found for email: ${paymentData.email}`);
            }
        } else {
            console.warn(`Payment failed for CheckoutRequestID: ${CheckoutRequestID}`);
        }

        res.status(200).json({ message: 'Payment updated successfully', status });
    } catch (error) {
        console.error('Error processing callback:', error.message || error);
        res.status(500).json({ error: 'Error processing callback' });
    }
};
