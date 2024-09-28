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

    // Show the password reset section
document.getElementById('forgot-password').addEventListener('click', function() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('password-reset-section').classList.remove('hidden');
});

// Handle the "Back to Login" button
document.getElementById('back-to-login').addEventListener('click', function() {
    document.getElementById('password-reset-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
});

// Handle the password reset form submission
document.getElementById('password-reset-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email').value;

    // Send the password reset email
    firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
            document.getElementById('reset-message').textContent = "Reset link sent! Check your email.";
        })
        .catch((error) => {
            document.getElementById('reset-message').textContent = "Error: " + error.message;
        });
});


// Handling OTP Verification
document.getElementById('otp-verification-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const otpCode = document.getElementById('otp-code').value;

    // Here you should verify the OTP code (oobCode)
    firebase.auth().verifyPasswordResetCode(otpCode)
        .then((email) => {
            // If verification is successful, show the new password form
            document.getElementById('otp-message').textContent = "Code verified successfully!";
            document.getElementById('new-password-form').classList.remove('hidden');
            document.getElementById('otp-verification-form').classList.add('hidden');
        })
        .catch((error) => {
            document.getElementById('otp-message').textContent = "Error: " + error.message;
        });
});

// For setting New Password
document.getElementById('new-password-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (newPassword === confirmNewPassword) {
        const otpCode = document.getElementById('otp-code').value; // Get the entered OTP code

        // Confirm the password reset with the OTP code and the new password
        firebase.auth().confirmPasswordReset(otpCode, newPassword)
            .then(() => {
                document.getElementById('new-password-message').textContent = "Password has been reset successfully!";
                // Redirect back to login section after successful reset
                setTimeout(() => {
                    document.getElementById('password-reset-section').classList.add('hidden');
                    document.getElementById('login-section').classList.remove('hidden');
                }, 2000);
            })
            .catch((error) => {
                document.getElementById('new-password-message').textContent = "Error: " + error.message;
            });
    } else {
        document.getElementById('new-password-message').textContent = "Passwords do not match.";
    }
});


    // Function to get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// On DOMContentLoaded, check for referral code in the URL
document.addEventListener('DOMContentLoaded', () => {
    const referralCodeInput = document.getElementById('referral-code');
    const referralCode = getUrlParameter('ref');

    if (referralCode) {
        referralCodeInput.value = referralCode; // Set the referral code
        referralCodeInput.disabled = true; // Lock the input
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
        const referralCode = document.getElementById('referral-code').value;

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

document.getElementById('logout-button').addEventListener('click', function() {
    firebase.auth().signOut()
    .then(() => {
        // Successfully logged out, now redirect to login section
        alert("You have successfully logged out.");
        
        // Hide all sections except the login section
        document.getElementById('login-section').classList.remove('hidden');
        document.getElementById('signup-section').classList.add('hidden');
        document.getElementById('password-reset-section').classList.add('hidden');
        document.getElementById('home').classList.add('hidden');

        // Scroll to the login section for better user experience
        document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' });
    })
    .catch((error) => {
        console.error("Error logging out: ", error);
    });
});


// Function to update dashboard fields
const updateDashboard = (userData) => {
    // Get the DOM elements for user inf
    const firstNameElement =document.getElementById('firstName');
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
        // User is not logged in, redirect to the login section
        document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' });
    }
});


        // JavaScript for pop-in effect when scrolling
        const paymentBox = document.querySelector('.payment-box');
        const confirmationBox = document.querySelector('.confirmation-box');

        // Function to handle scrolling pop-in effect
        const handleScroll = () => {
            const paymentBoxTop = paymentBox.getBoundingClientRect().top;
            const confirmationBoxTop = confirmationBox.getBoundingClientRect().top;
            const triggerHeight = window.innerHeight * 0.8; // Trigger pop-in when section is 80% in view

            if (paymentBoxTop < triggerHeight) {
                paymentBox.classList.add('visible');
            }
            if (confirmationBoxTop < triggerHeight) {
                confirmationBox.classList.add('visible');
            }
        };

        // Attach the scroll event listener
        window.addEventListener('scroll', handleScroll);
    
// JavaScript to toggle mobile navigation
document.getElementById('hamburger-icon').addEventListener('click', function() {
    var mobileNav = document.getElementById('mobile-nav');
    mobileNav.classList.toggle('show');
});
// referal links
document.addEventListener('DOMContentLoaded', function () {
    // Fetch the referral link (Assume it's passed or loaded from the backend)
    const referralLink = "https://anto-4ny.github.io/www.sanfiattechnologies.com/signup?referral=your-user-id"; // Replace with dynamic user link

    // Set referral link in the HTML
    document.getElementById('referral-link').textContent = referralLink;

    // Copy referral link to clipboard
    document.getElementById('copy-link-button').addEventListener('click', function () {
        const tempInput = document.createElement('input');
        document.body.appendChild(tempInput);
        tempInput.value = referralLink;
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Referral link copied to clipboard!');
    });

    // WhatsApp sharing functionality
    document.getElementById('whatsapp-share-button').addEventListener('click', function (e) {
        e.preventDefault();

        const encodedMessage = encodeURIComponent(
            `Hey, sign up using my referral link: ${referralLink} and enjoy the benefits!`
        );

        const whatsappURL = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappURL, '_blank');
    });
});

//referred users
document.addEventListener('DOMContentLoaded', async function () {
    const email = "user-email@example.com"; // Replace this with actual logged-in user email
    const referralSection = document.getElementById('referrals-section');
    const referralList = document.getElementById('referral-list');

    // Function to fetch referred users
    async function fetchReferredUsers() {
        try {
            const response = await fetch(`/get-referrals?email=${email}`);
            const referrals = await response.json();

            if (response.ok) {
                // Display the list of referred users
                referralList.innerHTML = '';
                referrals.forEach(referral => {
                    const listItem = document.createElement('li');
                    const status = referral.hasPaidFee ? 'Paid' : 'Not Paid';
                    listItem.textContent = `Email: ${referral.email}, Phone: ${referral.phoneNumber}, Status: ${status}`;
                    referralList.appendChild(listItem);
                });
            } else {
                referralList.textContent = 'Failed to load referrals';
            }
        } catch (error) {
            console.error('Error fetching referrals:', error);
            referralList.textContent = 'Refer people using your referral link above. you can copy to your clipboard or click the WhatsApp icon and share the link';
        }
    }

    // Fetch and display referred users
    fetchReferredUsers();
});



