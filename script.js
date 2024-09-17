import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7t1wWHhPYBitqKC4SJ8lqP1WMLDefCxo",
    authDomain: "antocap-referrals.firebaseapp.com",
    projectId: "antocap-referrals",
    storageBucket: "antocap-referrals.appspot.com",
    messagingSenderId: "1071760453747",
    appId: "1:1071760453747:web:fafa7ac624ba7452e6fa06",
    measurementId: "G-EPLJB8MTRH"
};
    const app = initializeApp(firebaseConfig); // Initialize Firebase inside DOMContentLoaded
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    const analytics = getAnalytics(app);

           document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const signupSection = document.getElementById('signup-section');
    const showSignupButton = document.getElementById('show-signup');
    const showLoginButton = document.getElementById('show-login');
    const loginMessage = document.getElementById('login-message');
    const signupMessage = document.getElementById('signup-message');
    const toggleLoginPassword = document.getElementById('toggle-login-password');
    const toggleSignupPassword = document.getElementById('toggle-signup-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const payButton = document.getElementById('pay-button');
    const paymentConfirmation = document.getElementById('payment-confirmation');

    // Toggle between login and signup sections
    showSignupButton.addEventListener('click', () => {
        loginSection.classList.add('hidden');
        signupSection.classList.remove('hidden');
    });

    showLoginButton.addEventListener('click', () => {
        signupSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // Toggle password visibility
    const togglePasswordVisibility = (input, eyeIcon) => {
        eyeIcon.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            eyeIcon.textContent = type === 'password' ? '👁️' : '🙈';
        });
    };

    togglePasswordVisibility(document.getElementById('login-password'), toggleLoginPassword);
    togglePasswordVisibility(document.getElementById('signup-password'), toggleSignupPassword);
    togglePasswordVisibility(document.getElementById('confirm-password'), toggleConfirmPassword);

    // Handle login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'dashboard.html'; // Redirect to dashboard or home page
        } catch (error) {
            loginMessage.textContent = error.message;
        }
    });

    // Handle registration
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = document.getElementById('first-name').value;
        const lastName = document.getElementById('last-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const paymentCode = paymentConfirmation.value;

        if (password !== confirmPassword) {
            signupMessage.textContent = 'Passwords do not match.';
            return;
        }

        try {
            // Check if email is already in use
            await signInWithEmailAndPassword(auth, email, password);
            signupMessage.textContent = 'Email already in use. Please login.';
        } catch (error) {
            // Register new user
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}` });

                // Check payment confirmation
                const paymentVerified = await verifyPayment(paymentCode); // Function to verify payment

                if (paymentVerified) {
                    await setDoc(doc(db, 'users', userCredential.user.uid), {
                        firstName,
                        lastName,
                        email
                    });
                    window.location.href = 'dashboard.html'; // Redirect after successful registration
                } else {
                    signupMessage.textContent = 'Payment not confirmed.';
                }
            } catch (error) {
                signupMessage.textContent = error.message;
            }
        }
    });

// Handle Pay button click
document.getElementById("pay-button").addEventListener("click", function() {
    const phoneNumber = document.getElementById("phone-number").value;
    
    if (phoneNumber.length === 10) {
        // Simulate MPESA payment process
        alert(`An MPESA pop-up will appear on phone number ${phoneNumber}. Please enter your MPESA PIN.`);
        
        // Add initial payment status to Firestore as pending
        db.collection("payments").add({
            phoneNumber: phoneNumber,
            amount: 250,
            status: "Pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(docRef) {
            console.log("Payment added with ID: ", docRef.id);
            alert("After receiving the MPESA transaction code, please enter it in the next field.");
        }).catch(function(error) {
            console.error("Error adding payment: ", error);
        });
    } else {
        alert("Please enter a valid phone number.");
    }
});

// Handle payment code submission
document.getElementById("submit-payment").addEventListener("click", function() {
    const paymentCode = document.getElementById("payment-confirmation").value;
    
    if (paymentCode) {
        // Update Firestore with the MPESA transaction code
        db.collection("payments").where("phoneNumber", "==", document.getElementById("phone-number").value)
        .get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                db.collection("payments").doc(doc.id).update({
                    mpesaCode: paymentCode,
                    status: "Waiting for Confirmation"
                });
                document.getElementById("payment-status").textContent = "Payment submitted. Please wait up to 30 minutes for confirmation.";
            });
        }).catch((error) => {
            console.error("Error updating payment: ", error);
        });
    } else {
        alert("Please enter the MPESA transaction code.");
    }
});

