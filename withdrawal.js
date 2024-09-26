// Ensure the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", () => {
    const withdrawForm = document.getElementById("withdraw-form");

    // Attach event listener to the withdrawal form submit event
    withdrawForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Get user input values
        const email = document.getElementById("email").value;
        const phoneNumber = document.getElementById("phoneNumber").value;
        const amount = document.getElementById("amount").value;

        // Validate inputs before sending to the backend
        if (!email || !phoneNumber || !amount) {
            displayMessage("Please fill in all fields", "error");
            return;
        }

        if (amount <= 0) {
            displayMessage("Invalid amount. Please enter a valid withdrawal amount", "error");
            return;
        }

        // Send withdrawal request to the server
        try {
            const response = await fetch("/api/withdraw", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, phoneNumber, amount })
            });

            const result = await response.json();

            if (response.ok) {
                displayMessage("Withdrawal initiated successfully. Please wait for confirmation.", "success");
            } else {
                displayMessage(result.error || "Failed to process withdrawal. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error initiating withdrawal:", error);
            displayMessage("An error occurred. Please try again.", "error");
        }
    });

    // Function to display messages (success or error)
    function displayMessage(message, type) {
        const messageContainer = document.getElementById("message");
        messageContainer.textContent = message;
        messageContainer.className = type === "success" ? "success-message" : "error-message";

        // Clear the message after 5 seconds
        setTimeout(() => {
            messageContainer.textContent = "";
        }, 5000);
    }
});
