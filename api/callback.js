const admin = require('firebase-admin');

// Initialize Firebase Admin SDK only if it's not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

// Firestore database instance
const db = admin.firestore();

module.exports = async (req, res) => {
    // Check if the method is POST
    if (req.method !== 'POST') {
        console.error('Error: Method not allowed');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Log the incoming request body for debugging
        console.log('Step 1: Received callback:', JSON.stringify(req.body, null, 2));

        // Ensure the body has the necessary structure
        const { Body } = req.body;
        if (!Body || !Body.stkCallback) {
            console.error('Step 2: Invalid request body');
            return res.status(400).json({ error: 'Invalid request body' });
        }

        const { stkCallback } = Body;
        const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback;

        console.log('Step 3: Extracted stkCallback:', stkCallback);

        // Fetch the payment record using CheckoutRequestID
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            console.error('Step 4: No payment record found for CheckoutRequestID:', CheckoutRequestID);
            return res.status(404).send('Payment record not found');
        }

        console.log('Step 5: Payment records found:', paymentRef.docs.map((doc) => doc.data()));

        // Extract the Mpesa receipt number from CallbackMetadata
        let mpesaCode = '';
        if (CallbackMetadata?.Item) {
            mpesaCode =
                CallbackMetadata.Item.find((item) => item.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        const status = ResultCode === 0 ? 'Success' : 'Failed';
        console.log('Step 6: Payment status:', status, 'Mpesa Code:', mpesaCode);

        const batch = db.batch();

        // Update payment status in the Firestore collection
        paymentRef.forEach((doc) => {
            console.log('Step 7: Updating payment record:', doc.id);
            batch.update(doc.ref, { status, mpesaCode });
        });

        await batch.commit();
        console.log('Step 8: Payment records updated successfully');

        // Update the user's balance if the payment was successful
        if (status === 'Success') {
            const paymentData = paymentRef.docs[0].data(); // Assume one record
            console.log('Step 9: Payment Data:', paymentData);

            const userDocRef = db.collection('users').doc(paymentData.email);

            const userDoc = await userDocRef.get();
            if (userDoc.exists) {
                const newBalance = (userDoc.data().balance || 0) + paymentData.amount;
                console.log('Step 10: Updating user balance to:', newBalance);

                await userDocRef.update({ balance: newBalance, paidRegistration: true });
                console.log('Step 11: User balance updated successfully');

                return res.status(200).json({ message: 'Payment successful', newBalance, mpesaCode });
            } else {
                console.error('Step 12: User not found in the database');
                return res.status(404).json({ error: 'User not found in the database' });
            }
        }

        res.status(200).json({ message: 'Payment updated successfully', status });
    } catch (error) {
        console.error('Callback processing error:', error.message || error);
        res.status(500).send('Error processing callback');
    }
};
