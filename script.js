// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    // Your Firebase configuration
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

document.addEventListener('DOMContentLoaded', () => {
    // Form Elements
    const registrationForm = document.getElementById('registration-form');
    const togglePassword = document.getElementById('toggle-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const paymentAmountInput = document.getElementById('payment-amount');
    const payButton = document.getElementById('pay-button');
    const paymentConfirmationInput = document.getElementById('payment-confirmation');
    const loginForm = document.getElementById('login-form');
    const toggleLoginPassword = document.getElementById('toggle-login-password');
    const loginPasswordInput = document.getElementById('login-password');
    const registrationContainer = document.getElementById('registration-form-container');
    const loginContainer = document.getElementById('login-form-container');
    const welcomeSection = document.getElementById('welcome-section');
    const welcomeMessage = document.getElementById('welcome-message');
    const whatsappShareButton = document.getElementById('whatsapp-share-button');
    const uploadButton = document.getElementById('upload-button');
    const viewsCountInput = document.getElementById('views-count');
    const fileInput = document.getElementById('view-screenshot');
    const statusMessage = document.getElementById('upload-status');
    const copyLinkButton = document.getElementById('copy-link-button');

    // Toggle between registration and login forms
    document.getElementById('show-login').addEventListener('click', () => {
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    document.getElementById('show-register').addEventListener('click', () => {
        loginContainer.style.display = 'none';
        registrationContainer.style.display = 'block';
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        toggleConfirmPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // Toggle login password visibility
    toggleLoginPassword.addEventListener('click', () => {
        const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
        loginPasswordInput.type = type;
        toggleLoginPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // Function to create a new user document with first and last names
    const createUserDocument = async (user) => {
        const userDoc = doc(db, "users", user.uid);
        await setDoc(userDoc, {
            firstName: "John", // Replace with actual data or user input
            lastName: "Doe",   // Replace with actual data or user input
            email: user.email,
            referrals: 0,
            views: 0
        });
    };

    // Function to update user document with new first and last names
    const updateUserDocument = async (firstName, lastName) => {
        const user = auth.currentUser;
        const userDoc = doc(db, "users", user.uid);
        await updateDoc(userDoc, {
            firstName: firstName,
            lastName: lastName
        });
    };

    // Handle payment button click
    payButton.addEventListener('click', async () => {
        const amount = parseInt(paymentAmountInput.value, 10);
        if (isNaN(amount) || amount !== 200) {
            alert("Please enter a valid amount of 200 Ksh.");
            return;
        }

        try {
            const response = await fetch('/api/request-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: 200 })
            });

            const result = await response.json();

            if (result.success) {
                alert('Payment request sent. Please check your phone to complete the payment.');
            } else {
                alert('Payment request failed. Please try again.');
            }
        } catch (error) {
            console.error('Error sending payment request:', error);
            alert('An error occurred. Please try again.');
        }
    });

    // Registration form submission
    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const paymentConfirmation = paymentConfirmationInput.value.trim();

        // Validate first and last names
        const namePattern = /^[A-Z][a-z]*$/;
        if (!namePattern.test(firstName)) {
            alert("Invalid first name. It must start with a capital letter and contain only letters.");
            return;
        }

        if (!namePattern.test(lastName)) {
            alert("Invalid last name. It must start with a capital letter and contain only letters.");
            return;
        }

        // Validate password complexity
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!passwordPattern.test(password)) {
            alert("Password must be at least 6 characters long, contain both uppercase and lowercase letters, and at least one number. It should not contain special characters like asterisks.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {
            // Verify the payment confirmation code with the server
            const response = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ paymentConfirmation })
            });

            const result = await response.json();

            if (!result.success) {
                alert('Invalid payment confirmation code. Please ensure you have paid the correct amount and entered the correct code.');
                return;
            }

            // Check if the email is already registered
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            if (signInMethods.length > 0) {
                alert("This email is already in use. Please use a different email or log in.");
                return;
            }

            // Register the user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                firstName: firstName,
                lastName: lastName,
                email: email,
                paymentConfirmation: paymentConfirmation,
                referrals: 0,
                views: 0,
                createdAt: new Date()
            });

            welcomeMessage.textContent = `Welcome, ${firstName}!`;
            registrationContainer.style.display = 'none';
            welcomeSection.style.display = 'block';
        } catch (error) {
            console.error('Error during registration:', error);
            alert('Registration failed. Please try again.');
        }
    });

    // Login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = loginPasswordInput.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = '/dashboard.html'; // Redirect to dashboard or another page
        } catch (error) {
            console.error('Error during login:', error);
            alert('Login failed. Please check your credentials and try again.');
        }
    });

    // File upload and views count
    uploadButton.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert("Please select a screenshot to upload.");
            return;
        }

        try {
            const storageRef = ref(storage, `screenshots/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Assuming you want to save the download URL to Firestore
            const user = auth.currentUser;
            const userDoc = doc(db, "users", user.uid);
            await updateDoc(userDoc, {
                screenshotURL: downloadURL,
                views: parseInt(viewsCountInput.value, 10)
            });

            statusMessage.textContent = 'Screenshot uploaded successfully!';
        } catch (error) {
            console.error('Error uploading screenshot:', error);
            statusMessage.textContent = 'Failed to upload screenshot.';
        }
    });

    // Copy referral link
    copyLinkButton.addEventListener('click', () => {
        const referralLink = `${window.location.origin}/referral?code=${auth.currentUser.uid}`;
        navigator.clipboard.writeText(referralLink).then(() => {
            alert('Referral link copied to clipboard!');
        }).catch((error) => {
            console.error('Error copying referral link:', error);
            alert('Failed to copy referral link.');
        });
    });

    // WhatsApp share button
    whatsappShareButton.addEventListener('click', () => {
        const referralLink = `${window.location.origin}/referral?code=${auth.currentUser.uid}`;
        const whatsappURL = `https://wa.me/?text=Check%20out%20this%20awesome%20site%20${encodeURIComponent(referralLink)}`;
        window.open(whatsappURL, '_blank');
    });

    // Authentication state change listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, show the welcome message and referral section
            welcomeMessage.textContent = `Welcome back, ${user.displayName || 'User'}!`;
            registrationContainer.style.display = 'none';
            loginContainer.style.display = 'none';
            welcomeSection.style.display = 'block';
        } else {
            // No user is signed in, show registration and login forms
            registrationContainer.style.display = 'block';
            loginContainer.style.display = 'none';
            welcomeSection.style.display = 'none';
        }
    });
});
                          
