/**
 * API route for fetching referred users
 */
module.exports = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email query parameter is required' });
    }

    try {
        console.log('Fetching referrals for:', email);

        // Fetch the user document
        const userDoc = await db.collection('users').doc(encodeURIComponent(email)).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const referredUsers = userDoc.data().referredUsers || [];
        const referrals = [];

        // Fetch referred users' statuses
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
        res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }
};
