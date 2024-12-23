const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-serviceAccountKey.json'); // Update the path

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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
module.exports.registerUser = async (req, res) => {
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
        const referralLink = `${req.headers.origin}/signup?ref=${newReferralCode}`;

        // Create the new user object
        const newUser = {
            firstName,
            lastName,
            email,
            password, // In a real application, this should be hashed
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

/**
 * Fetch referred users and their statuses
 */
module.exports.getReferrals = async (req, res) => {
    const { email } = req.query;

    try {
        console.log('Fetching referrals for:', email);

        // Fetch the user document
        const userDoc = await db.collection('users').doc(encodeURIComponent(email)).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Retrieve the list of referred users
        const referredUsers = userDoc.data().referredUsers || [];
        const referrals = [];

        // Process referred users
        const referralPromises = referredUsers.map(async (referredEmail) => {
            const referredDoc = await db.collection('users').doc(encodeURIComponent(referredEmail)).get();
            if (referredDoc.exists) {
                referrals.push({
                    email: referredDoc.id,
                    isActive: referredDoc.data().isActive || false,
                });
            }
        });

        await Promise.all(referralPromises);

        console.log('Referrals fetched successfully:', referrals);
        res.status(200).json(referrals);
    } catch (error) {
        console.error('Error fetching referrals:', error.message);
        res.status(500).json({ error: 'Failed to fetch referrals' });
    }
};
