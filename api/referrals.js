const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

module.exports = async (req, res) => {
    const { email } = req.params;

    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userData = userDoc.data();
        if (!userData.referredUsers || userData.referredUsers.length === 0) {
            return res.status(200).json({ message: 'No referrals yet.', referrals: [] });
        }

        // Fetch referred users' details
        const referralPromises = userData.referredUsers.map(refEmail => db.collection('users').doc(refEmail).get());
        const referralDocs = await Promise.all(referralPromises);

        const referrals = referralDocs.map(doc => {
            const refData = doc.data();
            return {
                email: doc.id,
                phoneNumber: refData.phoneNumber,
                paidRegistration: refData.paidRegistration
            };
        });

        res.status(200).json({ referrals });
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referrals.' });
    }
};
