const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://antocap-referrals.firebaseio.com',
});

const db = admin.firestore();

module.exports = async (req, res) => {
    const { Body } = req.body;
    const { stkCallback } = Body;

    if (stkCallback && stkCallback.ResultCode !== undefined) {
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        try {
            const paymentRef = await db.collection('payments')
                .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
                .get();

            if (!paymentRef.empty) {
                let mpesaCode = '';
                if (CallbackMetadata && CallbackMetadata.Item) {
                    mpesaCode = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber')?.Value || '';
                }

                paymentRef.forEach(async (doc) => {
                    const paymentData = doc.data();
                    const updatedStatus = ResultCode === 0 ? 'Success' : 'Failed';

                    await db.collection('payments').doc(doc.id).update({
                        status: updatedStatus,
                        mpesaCode: mpesaCode || 'N/A',
                    });

                    if (updatedStatus === 'Success') {
                        const userDocRef = db.collection('users').doc(paymentData.email);

                        // Update the user balance
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
                });
            } else {
                console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
                res.status(404).send('Payment not found');
            }
        } catch (error) {
            console.error('Error updating payment status:', error);
            res.status(500).send('Failed to process callback');
        }
    } else {
        console.error('Invalid callback data received');
        res.status(400).send('Invalid callback data');
    }
};
