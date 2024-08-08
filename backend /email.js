const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = 3000;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));

app.post('/upload', upload.single('screenshot'), (req, res) => {
    const views = req.body.views;
    const file = req.file;

    // Send email
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your-email@gmail.com',
            pass: 'your-email-password'
        }
    });

    let mailOptions = {
        from: 'your-email@gmail.com',
        to: 'your-email@gmail.com',
        subject: 'New Screenshot Upload',
        text: `Number of Views: ${views}`,
        attachments: [
            {
                filename: file.originalname,
                path: path.join(__dirname, 'uploads', file.filename)
            }
        ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Error:', error);
            return res.status(500).send('Error sending email.');
        }
        console.log('Email sent:', info.response);
        res.send('Screenshot uploaded successfully!');
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
