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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Debugging: Log Firebase initialization
console.log("Firebase initialized");

// DOMContentLoaded Event Listener
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired");

    const hamburgerIcon = document.getElementById('hamburger-icon');
    const mobileNav = document.getElementById('mobile-nav');

    if (hamburgerIcon && mobileNav) {
        hamburgerIcon.addEventListener('click', () => {
            mobileNav.classList.toggle('show');
            console.log("Mobile navigation toggled");
        });
    } else {
        console.error("Mobile navigation elements not found");
    }

    // Toggle auth state based on localStorage
    const authState = localStorage.getItem('auth-state') || 'register';
    toggleAuthState(authState);

    // Form Elements
    const registrationForm = document.getElementById('registration-form');
    const loginForm = document.getElementById('login-form');
    const fileInput = document.getElementById('view-screenshot');
    const referralLinkButton = document.getElementById('copy-referral-link');
    const whatsappShareButton = document.getElementById('whatsapp-share');
    const packageContainers = document.querySelectorAll('.package-container');

    // Handle toggling of password visibility
    togglePasswordVisibility('toggle-password', 'password');
    togglePasswordVisibility('toggle-confirm-password', 'confirm-password');
    togglePasswordVisibility('toggle-login-password', 'login-password');

    // Event Listeners
    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    } else {
        console.error("Registration form not found");
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error("Login form not found");
    }

    if (fileInput) {
        document.getElementById('upload-button').addEventListener('click', handleFileUpload);
    } else {
        console.error("File input or upload button not found");
    }

    if (referralLinkButton) {
        referralLinkButton.addEventListener('click', copyReferralLink);
    } else {
        console.error("Referral link button not found");
    }

    if (whatsappShareButton) {
        whatsappShareButton.addEventListener('click', shareOnWhatsApp);
    } else {
        console.error("WhatsApp share button not found");
    }

    if (packageContainers.length) {
        packageContainers.forEach(container => {
            container.addEventListener('click', () => {
                const packageDetails = container.querySelector('.package-details');
                packageDetails.classList.toggle('show');
                console.log(`Package details toggled for ${container.id}`);
            });
        });
    } else {
        console.error("Package containers not found");
    }
});

// Helper functions
function togglePasswordVisibility(toggleId, inputId) {
    const toggleButton = document.getElementById(toggleId);
    const inputField = document.getElementById(inputId);

    if (toggleButton && inputField) {
        toggleButton.addEventListener('click', () => {
            const type = inputField.type === 'password' ? 'text' : 'password';
            inputField.type = type;
            toggleButton.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
            console.log(`Password visibility toggled for ${inputId}`);
        });
    } else {
        console.error(`Toggle button or input field not found for ${inputId}`);
    }
}

function toggleAuthState(state) {
    const registrationContainer = document.getElementById('auth-section-register');
    const loginContainer = document.getElementById('auth-section-login');
    const welcomeSection = document.getElementById('welcome-section');

    if (state === 'login') {
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        welcomeSection.style.display = 'none';
        console.log("Switched to login view");
    } else if (state === 'register') {
        registrationContainer.style.display = 'block';
        loginContainer.style.display = 'none';
        welcomeSection.style.display = 'none';
        console.log("Switched to registration view");
    } else if (state === 'loggedIn') {
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        welcomeSection.style.display = 'block';
        console.log("Switched to welcome view");
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    console.log("Registration form submitted");

    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const paymentConfirmation = document.getElementById('payment-confirmation').value.trim();

    // Validate inputs
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
        showAlert(document.getElementById('password'), "Password must be at least 6 characters long, contain both uppercase and lowercase letters, and at least one number.", 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert(document.getElementById('confirm-password'), "Passwords do not match!", 'error');
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
            showAlert(document.getElementById('payment-confirmation'), 'Invalid payment confirmation code. Please ensure you have paid the correct amount and entered the correct code.', 'error');
            return;
        }

        const signInMethods = await getAuth().fetchSignInMethodsForEmail(email);
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

        document.getElementById('welcome-message').textContent = `Welcome, ${firstName}!`;
        localStorage.setItem('auth-state', 'loggedIn');
        toggleAuthState('loggedIn');
    } catch (error) {
        console.error('Error registering user:', error);
        showAlert(document.getElementById('registration-form'), 'Registration failed. Please try again later.', 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    console.log("Login form submitted");

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('auth-state', 'loggedIn');
        toggleAuthState('loggedIn');
    } catch (error) {
        console.error('Error logging in:', error);
        showAlert(document.getElementById('login-password'), 'Login failed. Please check your email and password and try again.', 'error');
    }
}

async function handleFileUpload() {
    const fileInput = document.getElementById('view-screenshot');
    const file = fileInput.files[0];

    if (!file) {
        showAlert(fileInput, 'Please select a file to upload.', 'error');
        return;
    }

    const userId = auth.currentUser.uid;
    const fileRef = ref(storage, `screenshots/${userId}/${file.name}`);

    try {
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        await updateDoc(doc(db, 'users', userId), {
            screenshotURL: downloadURL
        });

        showAlert(fileInput, 'File uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading file:', error);
        showAlert(fileInput, 'File upload failed. Please try again.', 'error');
    }
}

function showAlert(inputElement, message, type) {
    let alertContainer = inputElement.parentElement.querySelector('.alert');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert';
        inputElement.parentElement.appendChild(alertContainer);
    }
    alertContainer.textContent = message;
    alertContainer.style.color = type === 'success' ? 'green' : 'red';
    console.log(`Alert: ${message}`);
}

function copyReferralLink() {
    const referralLink = document.getElementById('referral-link');
    navigator.clipboard.writeText(referralLink.textContent)
        .then(() => {
            showAlert(referralLink, 'Referral link copied to clipboard!', 'success');
            console.log("Referral link copied to clipboard");
        })
        .catch(error => {
            showAlert(referralLink, 'Failed to copy referral link. Please try again.', 'error');
            console.error('Error copying referral link:', error);
        });
}

function shareOnWhatsApp() {
    const referralLink = document.getElementById('referral-link').textContent;
    const message = encodeURIComponent(`Check out this referral link: ${referralLink}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
    console.log("Shared on WhatsApp");
                          }
    
