document.getElementById('withdrawalForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const amount = document.getElementById('amount').value;

    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, phoneNumber, amount })
        });

        const result = await response.json();
        document.getElementById('responseMessage').textContent = result.message || result.error;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('responseMessage').textContent = 'An error occurred while processing your request.';
    }
});
