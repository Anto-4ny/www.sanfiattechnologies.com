const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// MPESA Configuration
const PAYBILL_NUMBER = process.env.PAYBILL_NUMBER;
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Use the live URL for production

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to get OAuth token from MPESA
async function getOAuthToken() {
  const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')}`
    }
  });
  return response.data.access_token;
}

// Function to get the password for the STK Push request
function getPassword(shortcode, passkey, timestamp) {
  const dataToEncode = shortcode + passkey + timestamp;
  return Buffer.from(dataToEncode).toString('base64');
}

// Endpoint to initiate payment request
app.post('/api/request-payment', async (req, res) => {
  try {
    const token = await getOAuthToken();
    const { amount, phoneNumber, accountReference } = req.body; // Account reference required for Paybill
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
    const password = getPassword(PAYBILL_NUMBER, 'your_mpesa_passkey', timestamp); // Replace 'your_mpesa_passkey' with your actual passkey

    const response = await axios.post(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      BusinessShortCode: PAYBILL_NUMBER,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // Paybill transaction type
      Amount: amount,
      PartyA: phoneNumber, // Customer's phone number
      PartyB: PAYBILL_NUMBER,
      PhoneNumber: phoneNumber,
      CallBackURL: 'your_callback_url', // Replace 'your_callback_url' with your actual callback URL
      AccountReference: accountReference, // Customer's account reference
      TransactionDesc: 'transaction_description' // Provide a description for the transaction
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

// Endpoint to verify payment (implement as needed)
app.post('/api/verify-payment', (req, res) => {
  const { paymentConfirmation } = req.body;
  // Implement payment verification logic using MPESA API
  res.send('Payment verification not implemented.');
});

// Endpoint to send email with screenshot details
app.post('/send-email', (req, res) => {
  const { email, viewsCount, fileURL } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'antocaptechnologies@gmail.com',
    subject: 'New Screenshot Upload',
    text: `User Email: ${email}\nNumber of Views: ${viewsCount}\nScreenshot URL: ${fileURL}`,
    html: `<p>User Email: ${email}</p><p>Number of Views: ${viewsCount}</p><p>Screenshot URL: <a href="${fileURL}">${fileURL}</a></p>`
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

// Start the server
app.listen(3000, () => console.log('Server running on port 3000'));

