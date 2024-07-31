// Endpoint to handle feedback response
app.post('/api/feedback', async (req, res) => {
  const { fileURL, feedback } = req.body;

  // Implement your logic to send feedback to the user
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: req.body.userEmail, // User's email from request body
    subject: 'Screenshot Upload Feedback',
    text: `Your screenshot at ${fileURL} has been ${feedback}.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send('Feedback sent.');
  } catch (error) {
    console.error('Error sending feedback:', error);
    res.status(500).send('Error sending feedback.');
  }
});
