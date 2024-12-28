const { db } = require('./firebase-admin');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed, only GET is allowed' });
    }

    const { CheckoutRequestID } = req.query; // Use req.query to access query parameters

    if (!CheckoutRequestID) {
        return res.status(400).json({ error: 'CheckoutRequestID is required' });
    }

    try {
        const paymentRef = await db
            .collection('payments')
            .where('mpesaCheckoutRequestID', '==', CheckoutRequestID)
            .get();

        if (paymentRef.empty) {
            return res.status(404).json({ error: 'Payment record not found' });
        }

        const payment = paymentRef.docs[0].data();
        res.status(200).json({ status: payment.status });
    } catch (error) {
        console.error('Error checking payment status:', error.message);
        res.status(500).json({ error: 'Error checking payment status' });
    }
};
