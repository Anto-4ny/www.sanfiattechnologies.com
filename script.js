import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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
document.getElementById('show-login').addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.setItem('auth-state', 'login');
    registrationContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});

document.getElementById('show-register').addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.setItem('auth-state', 'register');
    loginContainer.style.display = 'none';
    registrationContainer.style.display = 'block';
});

// Toggle password visibility
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
}

if (toggleConfirmPassword && confirmPasswordInput) {
    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        toggleConfirmPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
}

// Toggle login password visibility
if (toggleLoginPassword && loginPasswordInput) {
    toggleLoginPassword.addEventListener('click', () => {
        const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
        loginPasswordInput.type = type;
        toggleLoginPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
}

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
                headers: {
                    'Content-Type': 'application/json'
                },
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

        // Validate first and last names
        const namePattern = /^[A-Z][a-z]*$/;
        if (!namePattern.test(firstName)) {
            showAlert(document.getElementById('first-name'), "Invalid first name. It must start with a capital letter and contain only letters.", 'error');
            return;
        }

        if (!namePattern.test(lastName)) {
            showAlert(document.getElementById('last-name'), "Invalid last name. It must start with a capital letter and contain only letters.", 'error');
            return;
        }

        // Validate password complexity
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!passwordPattern.test(password)) {
            showAlert(passwordInput, "Password must be at least 6 characters long, contain both uppercase and lowercase letters, and at least one number.", 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAlert(confirmPasswordInput, "Passwords do not match!", 'error');
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
                showAlert(paymentConfirmationInput, 'Invalid payment confirmation code. Please ensure you have paid the correct amount and entered the correct code.', 'error');
                return;
            }

            // Check if the email is already registered
            const signInMethods = await getAuth().fetchSignInMethodsForEmail(email);
            if (signInMethods.length > 0) {
                showAlert(emailInput, "This email is already in use. Please use a different email or log in.", 'error');
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
            localStorage.setItem('auth-state', 'loggedIn');
            registrationContainer.style.display = 'none';
            loginContainer.style.display = 'none';
            welcomeSection.style.display = 'block';
        } catch (error) {
            console.error('Error during registration:', error);
            showAlert(registrationForm, 'Registration failed. Please try again.', 'error');
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
            const userCredential = await sign
                                                    const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                document.getElementById('user-email').textContent = userData.email;
                document.getElementById('referral-count').textContent = userData.referrals;
                document.getElementById('total-views').textContent = userData.views;
                document.getElementById('total-earnings').textContent = userData.earnings || 0;
                
                localStorage.setItem('auth-state', 'loggedIn');
                registrationContainer.style.display = 'none';
                loginContainer.style.display = 'none';
                welcomeSection.style.display = 'block';
            } else {
                showAlert(loginForm, 'User data not found.', 'error');
            }
        } catch (error) {
            console.error('Error during login:', error);
            showAlert(loginForm, 'Login failed. Please check your email and password and try again.', 'error');
        }
    });
}

// Handle file upload and views count
if (uploadButton) {
    uploadButton.addEventListener('click', async () => {
        const viewsCount = parseInt(viewsCountInput.value, 10);
        if (isNaN(viewsCount) || viewsCount <= 0) {
            showAlert(viewsCountInput, 'Please enter a valid number of views.', 'error');
            return;
        }

        const file = fileInput.files[0];
        if (!file) {
            showAlert(fileInput, 'Please select a screenshot to upload.', 'error');
            return;
        }

        try {
            const storageRef = ref(storage, `screenshots/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update user data in Firestore
            const user = auth.currentUser;
            if (user) {
                await updateDoc(doc(db, 'users', user.uid), {
                    views: viewsCount,
                    screenshotURL: downloadURL
                });
                
                statusMessage.textContent = 'Screenshot uploaded successfully.';
                statusMessage.style.color = 'green';
                viewsCountInput.value = '';
                fileInput.value = '';
            } else {
                showAlert(uploadButton, 'You must be logged in to upload screenshots.', 'error');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showAlert(uploadButton, 'Failed to upload screenshot. Please try again.', 'error');
        }
    });
}

// Copy referral link to clipboard
if (copyLinkButton) {
    copyLinkButton.addEventListener('click', () => {
        const referralLink = document.getElementById('referral-link').textContent;
        navigator.clipboard.writeText(referralLink).then(() => {
            showAlert(copyLinkButton, 'Referral link copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Error copying link:', err);
            showAlert(copyLinkButton, 'Failed to copy referral link.', 'error');
        });
    });
}

// Show alerts in the appropriate boxes
function showAlert(element, message, type) {
    const alertBox = document.createElement('p');
    alertBox.textContent = message;
    alertBox.style.color = type === 'success' ? 'green' : 'red';
    alertBox.style.fontSize = 'small';
    element.parentElement.insertBefore(alertBox, element.nextSibling);
    setTimeout(() => {
        alertBox.remove();
    }, 5000);
}

// Initialize the application state
document.addEventListener('DOMContentLoaded', () => {
    const authState = localStorage.getItem('auth-state');
    if (authState === 'loggedIn') {
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        welcomeSection.style.display = 'block';
    } else if (authState === 'register') {
        registrationContainer.style.display = 'block';
        loginContainer.style.display = 'none';
    } else {
        registrationContainer.style.display = 'block';
        loginContainer.style.display = 'none';
    }
});





document.addEventListener('DOMContentLoaded', () => {
    const payButtons = document.querySelectorAll('.pay-button');

    payButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const packageType = button.getAttribute('data-package');
            const amount = getPackageAmount(packageType);

            try {
                const response = await fetch('/api/request-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ amount })
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
    });
});

function getPackageAmount(packageType) {
    switch(packageType) {
        case 'basic': return 500;
        case 'standard': return 1000;
        case 'premium': return 2000;
        default: return 0;
    }
}

// Generate referral link for a given package
function generateReferralLink(packageName) {
    const baseUrl = window.location.href.split('?')[0];
    return `${baseUrl}?package=${packageName}`;
}

// Set referral link and copy to clipboard functionality
function setReferralLinks() {
    const packageNames = ['basic', 'standard', 'premium', 'ultimate'];
    packageNames.forEach(packageName => {
        const referralLink = generateReferralLink(packageName);
        document.getElementById(`${packageName}-referral-link`).textContent = referralLink;
    });
}

// Copy referral link to clipboard
function copyReferralLink(packageName) {
    const referralLink = generateReferralLink(packageName);
    navigator.clipboard.writeText(referralLink).then(() => {
        alert('Referral link copied to clipboard!');
    }, (err) => {
        console.error('Failed to copy link: ', err);
    });
}

// Initialize the referral links on page load
window.onload = function() {
    setReferralLinks();
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // Show the welcome section and dashboard
            document.getElementById('welcome-section').style.display = 'block';
            document.getElementById('auth-section-register').style.display = 'none';
            document.getElementById('auth-section-login').style.display = 'none';

            // Fetch user data and update dashboard
            const userId = user.uid;
            const db = firebase.firestore();
            const userDoc = db.collection('users').doc(userId);

            userDoc.get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    document.getElementById('user-email').textContent = data.email;
                    document.getElementById('referral-count').textContent = data.referrals || 0;
                    document.getElementById('total-views').textContent = data.totalViews || 0;
                    document.getElementById('total-earnings').textContent = data.totalEarnings || 0;
                    document.getElementById('amount-paid').textContent = data.amountPaid || 0;
                }
            }).catch(error => {
                console.error('Error fetching user data: ', error);
            });
        } else {
            // User is not logged in
            document.getElementById('welcome-section').style.display = 'none';
            document.getElementById('auth-section-register').style.display = 'block';
            document.getElementById('auth-section-login').style.display = 'block';
        }
    });
};

// Request payment
function requestPayment(packageName) {
    // Call your server to initiate payment request
    fetch(`/api/request-payment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ package: packageName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Payment request initiated. Please check your MPESA for further instructions.');
        } else {
            alert('Failed to initiate payment. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error initiating payment:', error);
    });
}

