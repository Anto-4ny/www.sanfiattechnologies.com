// api/check-status.js
const { db } = require('./firebase-admin');

module.exports = async (req, res) => {
    const { CheckoutRequestID } = req.params;

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
