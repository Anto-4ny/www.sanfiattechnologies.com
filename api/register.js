// api/register.js

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { db } = require('./firebase-admin'); // Import Firestore instance

const SALT_ROUNDS = 5; // Define a salt round value for bcrypt

/**
 * Generate a referral code based on the user's email
 */
function generateReferralCode(email) {
    return email.split('@')[0] + '-' + uuidv4().slice(0, 8);
}

/**
 * Save the user to the Firestore database
 */
async function saveUserToDatabase(user) {
    try {
        const userDoc = db.collection('users').doc(encodeURIComponent(user.email));
        await userDoc.set(user);
    } catch (error) {
        throw new Error('Failed to save user to database: ' + error.message);
    }
}

/**
 * Register a new user with a referral code
 */
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const { firstName, lastName, email, password, referralCode } = req.body;

    try {
        console.log('Incoming Request Body:', req.body);

        // Check if user already exists
        const existingUser = await db.collection('users').doc(encodeURIComponent(email)).get();
        if (existingUser.exists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Generate new referral code and referral link
        const newReferralCode = generateReferralCode(email);
        const referralLink = `${req.headers.origin}/index?ref=${newReferralCode}`;

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = {
            firstName,
            lastName,
            email,
            password: hashedPassword, // Store the hashed password
            referralCode: newReferralCode,
            referralLink,
            referredBy: referralCode || null,
            balance: 0,
            isActive: false,
            referredUsers: [],
        };

        // Save the new user to Firestore
        await saveUserToDatabase(newUser);

        // Update the referrer's data if applicable
        if (referralCode) {
            const referrerSnapshot = await db
                .collection('users')
                .where('referralCode', '==', referralCode)
                .limit(1)
                .get();

            if (!referrerSnapshot.empty) {
                const referrer = referrerSnapshot.docs[0];
                await db.collection('users').doc(referrer.id).update({
                    referredUsers: admin.firestore.FieldValue.arrayUnion(email),
                });
            }
        }

        console.log('User registered successfully with referral code:', newReferralCode);
        res.status(200).json({ referralCode: newReferralCode, referralLink });
    } catch (error) {
        console.error('Error in registration:', error.message);
        res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
};
