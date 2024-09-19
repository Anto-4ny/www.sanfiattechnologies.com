import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
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

    // Handle login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            // Sign in the user with email and password
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'dashboard.html'; // Redirect to dashboard if login is successful
        } catch (error) {
            // Display error message if login fails
            loginMessage.textContent = error.message;
            loginMessage.classList.add('error'); // Assuming 'error' is a CSS class for styling errors
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

        if (password !== confirmPassword) {
            signupMessage.textContent = 'Passwords do not match.';
            signupMessage.classList.add('error'); // Add error styling
            return;
        }

        try {
            // Register new user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}` });

            // Store user data in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                firstName,
                lastName,
                email
            });

            window.location.href = 'dashboard.html'; // Redirect after successful registration
        } catch (error) {
            signupMessage.textContent = error.message;
            signupMessage.classList.add('error'); // Ensure the message is displayed correctly
        }
    });
});

// Function to update dashboard fields
const updateDashboard = (userData) => {
    // Get the DOM elements for user info
    const userEmailElement = document.getElementById('user-email');
    const referralCountElement = document.getElementById('referral-count');
    const totalViewsElement = document.getElementById('total-views');
    const totalEarningsElement = document.getElementById('total-earnings');
    const amountPaidElement = document.getElementById('amount-paid');

    // Update fields with user data
    if (userData) {
        userEmailElement.textContent = userData.email || 'No email';
        referralCountElement.textContent = userData.referrals || 0;
        totalViewsElement.textContent = userData.totalViews || 0;
        totalEarningsElement.textContent = userData.totalEarnings || 0;
        amountPaidElement.textContent = userData.amountPaid || 0;
    }
};

// Check if a user is logged in and fetch their data
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in
        const userEmail = user.email;

        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            userData.email = userEmail; // Add email to userData for easier display

            // Update the dashboard with fetched user data
            updateDashboard(userData);
        } else {
            console.log('No user data found in Firestore.');
            // Update dashboard with basic info if no data found
            updateDashboard({ email: userEmail });
        }
    } else {
        // User is not logged in
        window.location.href = 'login.html'; // Redirect to login if not logged in
    }
});

