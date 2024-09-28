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
    const passwordResetSection = document.getElementById('password-reset-section');
    const showSignupButton = document.getElementById('show-signup');
    const showLoginButton = document.getElementById('show-login');
    const loginMessage = document.getElementById('login-message');
    const signupMessage = document.getElementById('signup-message');
    const toggleLoginPassword = document.getElementById('toggle-login-password');
    const toggleSignupPassword = document.getElementById('toggle-signup-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const logoutButton = document.getElementById('logout-button');

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
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'dashboard.html'; // Redirect to dashboard if login is successful
        } catch (error) {
            loginMessage.textContent = error.message;
            loginMessage.classList.add('error');
        }
    });

    // Show the password reset section
    document.getElementById('forgot-password').addEventListener('click', () => {
        loginSection.classList.add('hidden');
        passwordResetSection.classList.remove('hidden');
    });

    // Handle the "Back to Login" button
    document.getElementById('back-to-login').addEventListener('click', () => {
        passwordResetSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
    });

    // Handle the password reset form submission
    document.getElementById('password-reset-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('reset-email').value;

        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                document.getElementById('reset-message').textContent = "Reset link sent! Check your email.";
            })
            .catch((error) => {
                document.getElementById('reset-message').textContent = "Error: " + error.message;
            });
    });

    // Handling OTP Verification
    document.getElementById('otp-verification-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const otpCode = document.getElementById('otp-code').value;

        firebase.auth().verifyPasswordResetCode(otpCode)
            .then(() => {
                document.getElementById('otp-message').textContent = "Code verified successfully!";
                document.getElementById('new-password-form').classList.remove('hidden');
                document.getElementById('otp-verification-form').classList.add('hidden');
            })
            .catch((error) => {
                document.getElementById('otp-message').textContent = "Error: " + error.message;
            });
    });

    // For setting New Password
    document.getElementById('new-password-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (newPassword === confirmNewPassword) {
            const otpCode = document.getElementById('otp-code').value;

            firebase.auth().confirmPasswordReset(otpCode, newPassword)
                .then(() => {
                    document.getElementById('new-password-message').textContent = "Password has been reset successfully!";
                    setTimeout(() => {
                        passwordResetSection.classList.add('hidden');
                        loginSection.classList.remove('hidden');
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
    const referralCodeInput = document.getElementById('referral-code');
    const referralCode = getUrlParameter('ref');

    if (referralCode) {
        referralCodeInput.value = referralCode;
        referralCodeInput.disabled = true;
    }

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
            signupMessage.classList.add('error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}` });

            await setDoc(doc(db, 'users', userCredential.user.uid), {
                firstName,
                lastName,
                email
            });

            window.location.href = 'dashboard.html'; // Redirect after successful registration
        } catch (error) {
            signupMessage.textContent = error.message;
            signupMessage.classList.add('error');
        }
    });

    // Handle logout and redirect to login section
    logoutButton.addEventListener('click', () => {
        firebase.auth().signOut()
            .then(() => {
                alert("You have successfully logged out.");
                document.getElementById('login-section').classList.remove('hidden');
                signupSection.classList.add('hidden');
                passwordResetSection.classList.add('hidden');
                document.getElementById('home').classList.add('hidden');
                loginSection.scrollIntoView({ behavior: 'smooth' });
            })
            .catch((error) => {
                console.error("Error logging out: ", error);
            });
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
document.getElementById('hamburger-icon').addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent the event from bubbling up to the document
    var mobileNav = document.getElementById('mobile-nav');
    mobileNav.classList.toggle('show');
});

// Close mobile navigation when clicking outside of it
document.addEventListener('click', function(event) {
    var mobileNav = document.getElementById('mobile-nav');
    var hamburgerIcon = document.getElementById('hamburger-icon');

    // If mobile nav is visible and user clicks outside of it or on a different element
    if (mobileNav.classList.contains('show') && !mobileNav.contains(event.target) && event.target !== hamburgerIcon) {
        mobileNav.classList.remove('show');
    }
});



// Referal links
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
            referralList.textContent = 'Refer people by sharing your referral link above.';
        }
    }

    // Fetch and display referred users
    fetchReferredUsers();
});


// Get current date
const today = new Date();
const formattedDate = today.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
document.getElementById('current-date').textContent = `Date: ${formattedDate}`;

// Product images URLs (can come from a backend or be hardcoded for now)
const productImages = [
    'images/product/Photo_1723191951676.png', // Day 1
    'images/product/Photo_1723191951676.png', // Day 2
    'images/product/Photo_1723191951676.png', // Day 3
    'images/product/Photo_1723191951676.png', // Day 4
    'images/product/Photo_1723191951676.png', // Day 5
    'images/product/Photo_1723191951676.png', // Day 6
    'images/product/Photo_1723191951676.png'  // Day 7
];


// Logic to rotate product based on the current day
const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

for (let i = 0; i < 7; i++) {
    const productImageElement = document.getElementById(`product-image-${i+1}`);
    const downloadLinkElement = document.getElementById(`download-image-${i+1}`);
    const whatsappShareElement = document.getElementById(`whatsapp-share-${i+1}`);

    const productImageUrl = productImages[(dayOfWeek + i) % 7]; // Rotate images based on day of week

    // Set image source
    productImageElement.src = productImageUrl;

    // Set download link
    downloadLinkElement.href = productImageUrl;

    // Set WhatsApp share link
    whatsappShareElement.href = `https://wa.me/?text=Check%20out%20this%20status%20image:%20${encodeURIComponent(productImageUrl)}`;
}


// Handling the notification close event
document.getElementById('close-notification').addEventListener('click', function() {
    // Hide the notification bar when close button is clicked
    document.getElementById('notification-bar').style.display = 'none';
    
    // Update notification count to 0 (mark as read)
    document.getElementById('notification-count').textContent = '0';
});

// Optional: You can also handle notification icon click if needed
document.getElementById('notification-icon').addEventListener('click', function() {
    alert('You have new notifications!');
});


