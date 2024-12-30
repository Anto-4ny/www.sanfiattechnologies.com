require('dotenv').config(); // Load environment variables from .env file

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed, only POST is allowed' });
    }

    try {
        // Extract parameters from the request body
        const { TransactionType, TransID, TransAmount, BusinessShortCode, MSISDN, InvoiceNumber } = req.body;

        // Validate that all required fields are present
        if (!TransactionType || !TransID || !TransAmount || !BusinessShortCode || !MSISDN || !InvoiceNumber) {
            return res.status(400).json({
                ResultCode: 1, // Reject transaction
                ResultDesc: 'Missing required parameters.',
            });
        }

        // Ensure the transaction type is "Till" (you can adjust this if necessary)
        if (TransactionType !== 'Till') {
            return res.status(400).json({
                ResultCode: 1, // Reject transaction
                ResultDesc: 'Invalid TransactionType. Only "Till" is supported.',
            });
        }

        // Ensure that the phone number (MSISDN) is in a valid format (e.g., starting with 254)
        const isValidMSISDN = MSISDN.match(/^254\d{9}$/); // Validates Kenyan phone numbers starting with 254
        if (!isValidMSISDN) {
            return res.status(400).json({
                ResultCode: 1, // Reject transaction
                ResultDesc: 'Invalid phone number format. Please use a valid 254 number.',
            });
        }

        // Implement the business logic to validate the transaction
        const isValidTransaction = TransAmount >= 250 && BusinessShortCode === process.env.BUSINESS_SHORT_CODE;

        if (!isValidTransaction) {
            return res.status(400).json({
                ResultCode: 1, // Reject transaction
                ResultDesc: 'Validation failed. Invalid transaction details.',
            });
        }

        // If validation succeeds, return a success response
        return res.status(200).json({
            ResultCode: 0, // Accept transaction
            ResultDesc: 'Validation successful.',
        });
    } catch (error) {
        console.error('Validation error:', error.message);
        res.status(500).json({ error: 'Error processing validation callback' });
    }
};
