// api/login.js

const bcrypt = require('bcrypt');
const { db } = require('./firebase-admin'); // Import Firestore instance

/**
 * Login a user
 */
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const { email, password } = req.body;

    try {
        console.log('Login attempt for:', email);

        // Fetch the user from Firestore
        const userDoc = await db.collection('users').doc(encodeURIComponent(email)).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = userDoc.data();

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log('User logged in successfully:', email);

        // Return user data and referral link
        res.status(200).json({
            email: userData.email,
            referralLink: userData.referralLink,
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
};
