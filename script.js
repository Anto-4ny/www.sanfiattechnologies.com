import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// DOMContentLoaded Event Listener for Mobile Navigation
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const mobileNav = document.getElementById('mobile-nav');

    if (hamburgerIcon && mobileNav) {
        hamburgerIcon.addEventListener('click', () => {
            mobileNav.classList.toggle('show');
        });
    }
});

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
const registrationContainer = document.getElementById('auth-section-register');
const loginContainer = document.getElementById('auth-section-login');
const welcomeSection = document.getElementById('welcome-section');
const welcomeMessage = document.getElementById('welcome-message');
const whatsappShareButton = document.getElementById('whatsapp-share-button');
const uploadButton = document.getElementById('upload-button');
const viewsCountInput = document.getElementById('views-count');
const fileInput = document.getElementById('view-screenshot');
const statusMessage = document.getElementById('upload-status');
const copyLinkButton = document.getElementById('copy-link-button');

// Toggle between registration and login forms
function toggleAuthState(state) {
    if (state === 'login') {
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    } else if (state === 'register') {
        loginContainer.style.display = 'none';
        registrationContainer.style.display = 'block';
    } else if (state === 'loggedIn') {
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        welcomeSection.style.display = 'block';
    }
}

// Event Listeners for Form Toggle
document.getElementById('show-login').addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.setItem('auth-state', 'login');
    toggleAuthState('login');
});

document.getElementById('show-register').addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.setItem('auth-state', 'register');
    toggleAuthState('register');
});

// Toggle password visibility
function togglePasswordVisibility(toggleButton, inputField) {
    if (toggleButton && inputField) {
        toggleButton.addEventListener('click', () => {
            const type = inputField.type === 'password' ? 'text' : 'password';
            inputField.type = type;
            toggleButton.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }
}

togglePasswordVisibility(togglePassword, passwordInput);
togglePasswordVisibility(toggleConfirmPassword, confirmPasswordInput);
togglePasswordVisibility(toggleLoginPassword, loginPasswordInput);

// Handle payment button click
if (payButton && paymentAmountInput) {
    payButton.addEventListener('click', async () => {
        const amount = parseInt(paymentAmountInput.value, 10);
        if (isNaN(amount) || amount !== 200) {
            showAlert(paymentAmountInput, "Please enter a valid amount of 200 Ksh.", 'error');
            return;
        }

        try {
            const response = await fetch('/api/request-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 200 })
            });

            const result = await response.json();
            if (result.success) {
                showAlert(paymentAmountInput, 'Payment request sent. Please check your phone to complete the payment.', 'success');
            } else {
                showAlert(paymentAmountInput, 'Payment request failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error sending payment request:', error);
            showAlert(paymentAmountInput, 'An error occurred. Please try again.', 'error');
        }
    });
}

// Registration form submission
if (registrationForm) {
    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const paymentConfirmation = paymentConfirmationInput.value.trim();

        // Validate names and passwords
        const namePattern = /^[A-Z][a-z]*$/;
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;

        if (!namePattern.test(firstName)) {
            showAlert(document.getElementById('first-name'), "Invalid first name. It must start with a capital letter and contain only letters.", 'error');
            return;
        }

        if (!namePattern.test(lastName)) {
            showAlert(document.getElementById('last-name'), "Invalid last name. It must start with a capital letter and contain only letters.", 'error');
            return;
        }

        if (!passwordPattern.test(password)) {
            showAlert(passwordInput, "Password must be at least 6 characters long, contain both uppercase and lowercase letters, and at least one number.", 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAlert(confirmPasswordInput, "Passwords do not match!", 'error');
            return;
        }

        try {
            const response = await fetch('/api/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentConfirmation })
            });

            const result = await response.json();
            if (!result.success) {
                showAlert(paymentConfirmationInput, 'Invalid payment confirmation code. Please ensure you have paid the correct amount and entered the correct code.', 'error');
                return;
            }

            const signInMethods = await auth.fetchSignInMethodsForEmail(email);
            if (signInMethods.length > 0) {
                showAlert(document.getElementById('email'), "This email is already in use. Please use a different email or log in.", 'error');
                return;
            }

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
            localStorage.setItem('auth-state', 'loggedIn');
            toggleAuthState('loggedIn');
        } catch (error) {
            console.error('Error registering user:', error);
            showAlert(registrationForm, 'Registration failed. Please try again later.', 'error');
        }
    });
}

// Login form submission
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = loginPasswordInput.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem('auth-state', 'loggedIn');
                        toggleAuthState('loggedIn');
        } catch (error) {
            console.error('Error logging in:', error);
            showAlert(loginPasswordInput, 'Login failed. Please check your email and password.', 'error');
        }
    });
}

// File upload
if (uploadButton && fileInput) {
    uploadButton.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            showAlert(fileInput, 'Please select a file to upload.', 'error');
            return;
        }

        const storageRef = ref(storage, 'screenshots/' + file.name);
        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                screenshotURL: downloadURL
            });
            showAlert(fileInput, 'File uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading file:', error);
            showAlert(fileInput, 'File upload failed. Please try again.', 'error');
        }
    });
}

// Helper function to show alerts
function showAlert(inputElement, message, type) {
    const alertContainer = inputElement.parentElement.querySelector('.alert');
    if (alertContainer) {
        alertContainer.textContent = message;
        alertContainer.style.color = type === 'success' ? 'green' : 'red';
    } else {
        const newAlert = document.createElement('div');
        newAlert.className = 'alert';
        newAlert.textContent = message;
        newAlert.style.color = type === 'success' ? 'green' : 'red';
        inputElement.parentElement.appendChild(newAlert);
    }
}

