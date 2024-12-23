module.exports = async (req, res) => {
    const { email } = req.body;

    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        await db.collection('users').doc(email).update({ isActive: true });

        const referredBy = userDoc.data().referredBy;
        if (referredBy) {
            const referrerSnapshot = await db.collection('users').where('referralCode', '==', referredBy).limit(1).get();
            if (!referrerSnapshot.empty) {
                const referrer = referrerSnapshot.docs[0];
                const newBalance = (referrer.data().balance || 0) + 50;

                await db.collection('users').doc(referrer.id).update({ balance: newBalance });
            }
        }

        res.status(200).json({ message: 'Account activated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to activate account' });
    }
};
