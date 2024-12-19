const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://antocap-referrals.firebaseio.com',
});

const db = admin.firestore();

module.exports = async (req, res) => {
    try {
        console.log("Request received:", req.body); // Log the entire request body

        // Assuming that req.body is an object and directly contains the stkCallback
        const { stkCallback } = req.body;

        if (!stkCallback) {
            console.error('Invalid callback data received');
            return res.status(400).send('Invalid callback data');
        }

        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        if (ResultCode === undefined) {
            console.error('Missing ResultCode');
            return res.status(400).send('Invalid callback data');
        }

        const paymentRef = await db.collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
            return res.status(404).send('Payment not found');
        }

        let mpesaCode = '';
        if (CallbackMetadata && CallbackMetadata.Item) {
            mpesaCode = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        for (const doc of paymentRef.docs) {
            const paymentData = doc.data();
            const updatedStatus = ResultCode === 0 ? 'Success' : 'Failed';

            await db.collection('payments').doc(doc.id).update({
                status: updatedStatus,
                mpesaCode: mpesaCode || 'N/A',
            });

            if (updatedStatus === 'Success') {
                const userDocRef = db.collection('users').doc(paymentData.email);

                const userDoc = await userDocRef.get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const newBalance = userData.balance + paymentData.amount;

                    await userDocRef.update({
                        balance: newBalance,
                        paidRegistration: true,
                    });

                    res.status(200).json({
                        message: 'Payment successful',
                        newBalance,
                        mpesaCode: mpesaCode || 'N/A',
                    });
                }
            } else {
                res.status(200).send('Payment failed');
            }
        }
    } catch (error) {
        console.error('Error processing callback:', error);
        res.status(500).send('Failed to process callback');
    }
};
