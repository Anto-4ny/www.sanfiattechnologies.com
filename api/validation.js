module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { TransactionType, TransID, TransAmount, BusinessShortCode, MSISDN, InvoiceNumber } = req.body;

        // Implement your validation logic here
        const isValidTransaction = TransAmount >= 250 && BusinessShortCode === process.env.BUSINESS_SHORT_CODE;

        if (!isValidTransaction) {
            return res.status(400).json({
                ResultCode: 1, // Reject transaction
                ResultDesc: 'Validation failed. Invalid transaction details.',
            });
        }

        // If validation succeeds
        return res.status(200).json({
            ResultCode: 0, // Accept transaction
            ResultDesc: 'Validation successful.',
        });
    } catch (error) {
        console.error('Validation error:', error.message);
        res.status(500).json({ error: 'Error processing validation callback' });
    }
};
