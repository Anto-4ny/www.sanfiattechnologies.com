const { db } = require('./firebase-admin'); // Import Firestore instance

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed, only GET is allowed' });
    }

    try {
        const { CheckoutRequestID, ResultCode, MpesaReceiptNumber } = req.query;

        if (!CheckoutRequestID || !ResultCode) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // Check if MpesaReceiptNumber is provided in the query
        let mpesaCode = MpesaReceiptNumber || '';

        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            return res.status(404).json({ error: 'Payment record not found' });
        }

        const status = ResultCode === '0' ? 'Success' : 'Failed';

        const batch = db.batch();

        paymentRef.forEach((doc) => {
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();

        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data();
            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const newBalance = (userDoc.data().balance || 0) + paymentData.amount;
                await userDocRef.update({ balance: newBalance, paidRegistration: true });
                return res.status(200).json({ message: 'Payment successful', newBalance, mpesaCode });
            }
        }

        res.status(200).json({ message: 'Payment status updated', status });
    } catch (error) {
        console.error('Confirmation callback error:', error.message);
        res.status(500).json({ error: 'Error processing confirmation callback' });
    }
};
