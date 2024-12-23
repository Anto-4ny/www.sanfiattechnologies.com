const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

/**
 * Register a new user with a referral code
 */
module.exports.registerUser = async (req, res) => {
    const { email, phoneNumber, referralCode } = req.body;

    try {
        // Check if user already exists
        const existingUser = await db.collection('users').doc(email).get();
        if (existingUser.exists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Generate new referral code
        const newReferralCode = uuidv4();
        const newUser = {
            email,
            phoneNumber,
            referralCode: newReferralCode,
            referredBy: referralCode || null,
            balance: 0,
            isActive: false,
            referredUsers: [],
        };

        // Save the new user in Firestore
        await db.collection('users').doc(email).set(newUser);

        // If referred by another user, update the referrer's data
        if (referralCode) {
            const referrerSnapshot = await db
                .collection('users')
                .where('referralCode', '==', referralCode)
                .limit(1)
                .get();

            if (!referrerSnapshot.empty) {
                const referrer = referrerSnapshot.docs[0];

                // Add this user to the referrer's referredUsers array
                await db.collection('users').doc(referrer.id).update({
                    referredUsers: admin.firestore.FieldValue.arrayUnion(email),
                });
            }
        }

        res.status(200).json({ referralCode: newReferralCode });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};

/**
 * Activate user account and reward the referrer
 */
module.exports.activateAccount = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the user exists
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Activate the user's account
        await db.collection('users').doc(email).update({ isActive: true });

        // Reward the referrer if applicable
        const referredBy = userDoc.data().referredBy;
        if (referredBy) {
            const referrerSnapshot = await db
                .collection('users')
                .where('referralCode', '==', referredBy)
                .limit(1)
                .get();

            if (!referrerSnapshot.empty) {
                const referrer = referrerSnapshot.docs[0];
                const referrerData = referrer.data();

                const newBalance = (referrerData.balance || 0) + 50;

                // Update referrer's balance
                await db.collection('users').doc(referrer.id).update({ balance: newBalance });
            }
        }

        res.status(200).json({ message: 'Account activated successfully' });
    } catch (error) {
        console.error('Error activating account:', error);
        res.status(500).json({ error: 'Failed to activate account' });
    }
};

/**
 * Fetch referred users and their statuses
 */
module.exports.getReferrals = async (req, res) => {
    const { email } = req.query;

    try {
        // Fetch the user document
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Retrieve the list of referred users
        const referredUsers = userDoc.data().referredUsers || [];
        const referrals = [];

        // Batch process referred users for better performance
        const referralPromises = referredUsers.map(async (referredEmail) => {
            const referredDoc = await db.collection('users').doc(referredEmail).get();
            if (referredDoc.exists) {
                referrals.push({
                    email: referredDoc.id,
                    isActive: referredDoc.data().isActive || false,
                });
            }
        });

        await Promise.all(referralPromises);

        res.status(200).json(referrals);
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referrals' });
    }
};
