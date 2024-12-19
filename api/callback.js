const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://antocap-referrals.firebaseio.com',
});

const db = admin.firestore();

module.exports = async (req, res) => {
    try {
        // Ensure the request method is POST
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        // Parse the incoming body (Vercel might not do it automatically)
        const body = req.body || (typeof req.body === 'string' ? JSON.parse(req.body) : {});

        // Validate the body content
        const { Body } = body;
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
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
                            const newBalance = (userData.balance || 0) + (paymentData.amount || 0);

                            await userDocRef.update({
                                balance: newBalance,
                                paidRegistration: true,
                            });

                            res.status(200).json({
                                message: 'Payment successful',
                                newBalance,
                                mpesaCode: mpesaCode || 'N/A',
                            });
                        } else {
                            res.status(404).json({ error: 'User not found' });
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
    } catch (error) {
        console.error('Error processing request body:', error);
        res.status(500).send('Error processing request');
    }
};