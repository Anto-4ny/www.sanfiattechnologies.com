const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

module.exports = async (req, res) => {
    const { phoneNumber, email, referralCode } = req.body;

    try {
        // Check if a user already exists
        const userDoc = await db.collection('users').doc(email).get();
        if (userDoc.exists) {
            return res.status(400).json({ error: 'User already exists.' });
        }

        // Generate a unique referral code for the new user
        const userReferralCode = uuidv4();

        // Save the new user along with their referral code
        await db.collection('users').doc(email).set({
            phoneNumber,
            email,
            referralCode: userReferralCode,
            referredBy: referralCode || null,
            balance: 0,
            registeredAt: admin.firestore.FieldValue.serverTimestamp(),
            paidRegistration: false
        });

        if (referralCode) {
            const referrer = await db.collection('users')
                .where('referralCode', '==', referralCode)
                .limit(1)
                .get();

            if (!referrer.empty) {
                const referrerDoc = referrer.docs[0];
                await db.collection('users').doc(referrerDoc.id).update({
                    referredUsers: admin.firestore.FieldValue.arrayUnion(email)
                });
            }
        }

        res.status(200).json({
            message: 'User registered successfully.',
            referralLink: `https://sanfiattechnologies-3phuquypw-antonys-projects-2571442e.vercel.app/register?referralCode=${userReferralCode}`
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user.' });
    }
};
