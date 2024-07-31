// server.js

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const TILL_NUMBER = process.env.TILL_NUMBER;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Use the live URL for production

// Function to get OAuth token from MPESA
async function getOAuthToken() {
    const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: {
                        'Authorization': `Basic ${Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')}`
                                }
                                    });
                                        return response.data.access_token;
                                        }

                                        // Endpoint to initiate payment request
                                        app.post('/api/request-payment', async (req, res) => {
                                            try {
                                                    const token = await getOAuthToken();
                                                            const { amount } = req.body;

                                                                    const response = await axios.post(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
                                                                                BusinessShortCode: TILL_NUMBER,
                                                                                            Password: 'your_encoded_password', // Encode based on MPESA requirements
                                                                                                        Timestamp: 'your_timestamp', // Current timestamp in the required format
                                                                                                                    TransactionType: 'CustomerPayBillOnline',
                                                                                                                                Amount: amount,
                                                                                                                                            PartyA: 'customer_phone_number', // Customer's phone number
                                                                                                                                                        PartyB: TILL_NUMBER,
                                                                                                                                                                    PhoneNumber: 'customer_phone_number', // Customer's phone number
                                                                                                                                                                                CallBackURL: 'your_callback_url',
                                                                                                                                                                                            AccountReference: 'account_reference',
                                                                                                                                                                                                        TransactionDesc: 'transaction_description'
                                                                                                                                                                                                                }, {
                                                                                                                                                                                                                            headers: {
                                                                                                                                                                                                                                            'Authorization': `Bearer ${token}`
                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                        res.json({ success: true, message: response.data.ResponseDescription });
                                                                                                                                                                                                                                                                            } catch (error) {
                                                                                                                                                                                                                                                                                    console.error('Error requesting payment:', error);
                                                                                                                                                                                                                                                                                            res.json({ success: false, message: 'Failed to request payment.' });
                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                });

                                                                                                                                                                                                                                                                                                // Endpoint to verify payment
                                                                                                                                                                                                                                                                                                app.post('/api/verify-payment', async (req, res) => {
                                                                                                                                                                                                                                                                                                    const { paymentConfirmation } = req.body;
                                                                                                                                                                                                                                                                                                        // Implement payment verification logic using MPESA API
                                                                                                                                                                                                                                                                                                        });

                                                                                                                                                                                                                                                                                                        app.listen(3000, () => {
                                                                                                                                                                                                                                                                                                            console.log('Server running on port 3000');
                                                                                                                                                                                                                                                                                                            });

     const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password'
  }
});

app.post('/send-email', (req, res) => {
  const { email, viewsCount, fileURL } = req.body;

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: 'your-email@gmail.com',
    subject: 'New Screenshot Upload',
    text: `User Email: ${email}\nNumber of Views: ${viewsCount}\nScreenshot URL: ${fileURL}`,
    html: `<p>User Email: ${email}</p><p>Number of Views: ${viewsCount}</p><p>Screenshot URL: <a href="${fileURL}">${fileURL}</a></p><br><button onclick="acceptUpload('${fileURL}')">Accept</button><button onclick="rejectUpload('${fileURL}')">Reject</button>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      res.status(500).send('Error sending email.');
    } else {
      res.status(200).send('Email sent successfully.');
    }
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));

