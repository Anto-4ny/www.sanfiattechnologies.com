document.getElementById('withdrawal-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const withdrawalAmount = parseFloat(document.getElementById('withdrawal-amount').value);
    const phoneNumber = document.getElementById('phone-number').value;
    const transactionFee = withdrawalAmount * 0.10;
    const netAmount = withdrawalAmount - transactionFee;

    if (withdrawalAmount < 1000 || withdrawalAmount > 15500) {
        document.getElementById('withdrawal-status').textContent = "Withdrawal amount must be between Ksh 1000 and Ksh 15500.";
        return;
    }

    // Fetch user's referral data to verify eligibility
    const userReferrals = await fetchUserReferrals(phoneNumber);
    if (userReferrals.totalReferrals < 10 || userReferrals.totalPaidReferrals < 10) {
        document.getElementById('withdrawal-status').textContent = "You need at least 10 paid referrals to withdraw.";
        return;
    }

    // Simulate MPESA transaction
    const confirmation = confirm(`You are withdrawing Ksh ${withdrawalAmount}. A transaction fee of Ksh ${transactionFee} will be deducted. You will receive Ksh ${netAmount}. Do you wish to continue?`);
    if (confirmation) {
        // Call backend API for withdrawal
        try {
            const response = await fetch('/api/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumber: phoneNumber,
                    amount: netAmount,
                    transactionFee: transactionFee
                })
            });

            const result = await response.json();

            if (response.ok) {
                document.getElementById('withdrawal-status').textContent = "Withdrawal successful! Funds will be processed shortly.";
            } else {
                document.getElementById('withdrawal-status').textContent = "Error processing withdrawal: " + result.message;
            }
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('withdrawal-status').textContent = "An error occurred. Please try again.";
        }
    }
});

// Mock function for checking user's referrals
async function fetchUserReferrals(phoneNumber) {
    // Replace with your backend API to check user referrals and registration payments
    return await fetch(`/api/user/${phoneNumber}/referrals`).then(response => response.json());
      }
      
