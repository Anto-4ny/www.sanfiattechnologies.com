module.exports = async (req, res) => {
    const { email } = req.query;

    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const referredUsers = userDoc.data().referredUsers || [];
        const referrals = [];

        for (const referredEmail of referredUsers) {
            const referralDoc = await db.collection('users').doc(referredEmail).get();
            if (referralDoc.exists) {
                referrals.push({
                    email: referralDoc.id,
                    paidAmount: referralDoc.data().paidAmount || 0,
                    notPaid: referralDoc.data().notPaid || 0,
                    isActive: referralDoc.data().isActive || false,
                });
            }
        }

        res.status(200).json(referrals);
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referrals.' });
    }
};
