const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

module.exports = async (req, res) => {
    const { email, phoneNumber, referralCode } = req.body;

    try {
        const existingUser = await db.collection('users').doc(email).get();
        if (existingUser.exists) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const newReferralCode = uuidv4();
        const newUser = {
            email,
            phoneNumber,
            referralCode: newReferralCode,
            referredBy: referralCode || null,
            balance: 0,
            isActive: false,
        };

        await db.collection('users').doc(email).set(newUser);

        // Add user to referrer's referred list and reward if applicable
        if (referralCode) {
            const referrerSnapshot = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get();
            if (!referrerSnapshot.empty) {
                const referrer = referrerSnapshot.docs[0];
                const referrerData = referrer.data();

                await db.collection('users').doc(referrer.id).update({
                    referredUsers: admin.firestore.FieldValue.arrayUnion(email),
                });

                // Update referrer's balance when the referred user pays (handled in another endpoint)
            }
        }

        res.status(200).json({ referralCode: newReferralCode });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to register user' });
    }
};
