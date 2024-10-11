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
    // Get the DOM elements for user info
    const firstNameElement = document.getElementById('firstName');
    const userEmailElement = document.getElementById('user-email');
    const referralCountElement = document.getElementById('referral-count');
    const totalViewsElement = document.getElementById('total-views');
    const totalEarningsElement = document.getElementById('total-earnings');
    const amountPaidElement = document.getElementById('amount-paid');
    const packageStatusElement = document.getElementById('package-status');
    
    // Update fields with user data
    if (userData) {
        firstNameElement.textContent = userData.firstName || 'No name';
        userEmailElement.textContent = userData.email || 'No email';
        referralCountElement.textContent = userData.referrals || 0;
        totalViewsElement.textContent = userData.totalViews || 0;
        totalEarningsElement.textContent = userData.totalEarnings || 0;
        amountPaidElement.textContent = userData.amountPaid || 0;
        packageStatusElement.textContent = userData.packageStatus || 'No active package';

        // Example: Update progress bars if you have percentage values
        document.getElementById('name-progress').style.width = `${userData.referrals * 10}%`; // Adjust as necessary
        // Repeat for other progress bars
    }
};

onAuthStateChanged(auth, async (user) => {
    // Function to fetch user data from Firestore and update pages
    const fetchAndUpdateUserData = async (user) => {
        const loadingElement = document.getElementById('loading'); // Assume you have a loading spinner
        loadingElement.style.display = 'block'; // Show loading state

        if (user) {
            const userEmail = user.email;

            try {
                // Fetch user data from Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userSnapshot = await getDoc(userDocRef);

                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data();
                    userData.email = userEmail; // Add email to userData for easier display
                    userData.firstName = userData.firstName || 'No name'; // Ensure first name is included
                    userData.packageStatus = userData.packageStatus || 'No active package'; // Ensure package status is included

                    // Update the dashboard with fetched user data
                    updateDashboard(userData);
                } else {
                    console.log('No user data found in Firestore.');
                    // Update dashboard with basic info if no data found
                    updateDashboard({ email: userEmail });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                loadingElement.style.display = 'none'; // Hide loading state
            }
        } else {
            // User is not logged in, redirect to the login section
            document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' });
        }
    };

    fetchAndUpdateUserData(user);
});

// Function to copy referral link
const copyReferralLink = () => {
    const referralLinkElement = document.getElementById('referral-link');
    navigator.clipboard.writeText(referralLinkElement.textContent)
        .then(() => {
            alert('Referral link copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
        });
};

document.getElementById('copy-link-button').addEventListener('click', copyReferralLink);
                   

// JavaScript for automatic pop-in effect
document.addEventListener('DOMContentLoaded', function () {
    // Select elements you want to animate
    const paymentBox = document.querySelector('.payment-box');
    const confirmationBox = document.querySelector('.confirmation-box');
    const infoBoxes = document.querySelectorAll('.info-box');

    // Add 'visible' class to each box to trigger animation on page load
    if (paymentBox) paymentBox.classList.add('visible');
    if (confirmationBox) confirmationBox.classList.add('visible');
    infoBoxes.forEach(box => {
        box.classList.add('show');
    });

    // Update progress bars (for example, based on user's data)
    updateProgressBar('#referral-box', 70);  // Example: update to actual user data
    updateProgressBar('#views-box', 50);     // Example percentage
});

// Function to update the progress bar
function updateProgressBar(selector, percentage) {
    const progressBar = document.querySelector(selector + ' .progress-bar');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
}

// Event listener for saving profile changes
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const userId = auth.currentUser.uid; // Get the currently logged-in user's ID
    const updatedData = {
        firstName: document.getElementById('firstName').textContent,
        email: document.getElementById('user-email').textContent,
        referrals: document.getElementById('referral-count').textContent,
        totalViews: document.getElementById('total-views').textContent,
        totalEarnings: document.getElementById('total-earnings').textContent,
        amountPaid: document.getElementById('amount-paid').textContent,
        packageStatus: document.getElementById('package-status').textContent,
        referralLink: document.getElementById('referral-link').textContent
    };

    // Update Firestore with the new data
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, updatedData, { merge: true });
    
    alert('Profile updated successfully!');
});


// Referral link and sharing functionality
document.addEventListener('DOMContentLoaded', function () {
    // Assume referral link is fetched or generated dynamically
    const referralLink = "https://anto-4ny.github.io/www.sanfiattechnologies.com/signup?referral=your-user-id"; // Replace with actual dynamic referral link

    // Set referral link in the HTML
    const referralLinkElement = document.getElementById('referral-link');
    referralLinkElement.textContent = referralLink;

    // Copy referral link to clipboard
    document.getElementById('copy-link-button').addEventListener('click', function () {
        const tempInput = document.createElement('input');
        tempInput.value = referralLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Referral link copied to clipboard!');
    });
    
// WhatsApp sharing functionality
    document.getElementById('whatsapp-share-button').addEventListener('click', function (e) {
        e.preventDefault();
        const message = `Hey, sign up using my referral link: ${referralLink} and enjoy the benefits of earning with me at Sanfiat Technologies!`;
        const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappURL, '_blank');
    });
});

// Make sure Firebase is initialized in your app
document.addEventListener('DOMContentLoaded', async function () {
    const referralList = document.getElementById('referral-list');

    // Check if a user is signed in
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in, get the email
            const email = user.email;

            // Function to fetch referred users based on user's email
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

        } else {
            // No user is signed in, redirect to login or handle accordingly
            alert("Please log in to view referrals.");
        }
    });
});
                          
    
// Toggle mobile navigation
document.getElementById('hamburger-icon').addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent event bubbling up to document
    var mobileNav = document.getElementById('mobile-nav');
    mobileNav.classList.toggle('show');
});

// Close mobile navigation when clicking outside of it
document.addEventListener('click', function(event) {
    var mobileNav = document.getElementById('mobile-nav');
    var hamburgerIcon = document.getElementById('hamburger-icon');

    // Close the menu if clicking outside and menu is open
    if (mobileNav.classList.contains('show') && !mobileNav.contains(event.target) && event.target !== hamburgerIcon) {
        mobileNav.classList.remove('show');
    }
});

// Handle dropdown functionality for subcategories
document.querySelectorAll('.has-submenu').forEach(function(item) {
    item.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent default link behavior
        this.classList.toggle('active');
        var submenu = this.nextElementSibling; // Find the next sibling which is the submenu div
        if (submenu && submenu.classList.contains('submenu')) {
            submenu.classList.toggle('show-submenu');
        }
    });
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

    // Optionally, update the unread notification count if needed
    document.getElementById('notification-count').textContent = '0';
});

const notificationCountElement = document.getElementById('notification-count');

// Listen for new notifications
notificationsRef.onSnapshot(snapshot => {
    const unreadCount = snapshot.docs.length;
    notificationCountElement.textContent = unreadCount;
});

// Function to generate a referral link based on package and user ID
function generateReferralLink(packageName, userId) {
    const baseUrl = "https://anto-4ny.github.io/www.sanfiattechnologies.com/packages.html/";  // Replace with your actual base URL
    const referralLink = `${baseUrl}?package=${packageName}&referrer=${userId}`;
    return referralLink;
}

// Function to display the referral link in the UI
function displayReferralLink(packageName, linkElementId, userId) {
    const referralLink = generateReferralLink(packageName, userId);
    const linkElement = document.getElementById(linkElementId);
    linkElement.textContent = referralLink;
}

// Function to copy the referral link to the clipboard
function copyReferralLink(packageName, linkElementId, userId) {
    const referralLink = generateReferralLink(packageName, userId);
    const tempInput = document.createElement("input");
    tempInput.value = referralLink;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    // Optionally, show a notification or alert to the user
    alert(`Referral link for ${packageName} copied: ${referralLink}`);
}

// Fetch user package data from Firestore and update the UI with package status
function updatePackageStatus(userId) {
    const userPackagesRef = firestore.collection('users').doc(userId).collection('packages');

    userPackagesRef.get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const packageData = doc.data();
            const statusElement = document.getElementById(`${packageData.packageType.toLowerCase()}-status`);

            if (packageData.status === 'active') {
                statusElement.textContent = 'Active';
                statusElement.style.color = 'green';
            } else {
                statusElement.textContent = 'Inactive';
                statusElement.style.color = 'red';
            }
        });
    });
}

// Fetch user packages from Firestore and render them dynamically
async function fetchUserPackages(userId) {
    const userPackagesRef = firestore.collection('users').doc(userId).collection('packages');
    const userPackagesSnapshot = await userPackagesRef.get();
    const packagesContainer = document.getElementById('user-packages');

    userPackagesSnapshot.forEach(doc => {
        const packageData = doc.data();
        const packageElement = document.createElement('div');
        packageElement.classList.add('package-box');
        packageElement.style.backgroundColor = packageData.color; // Customize package color

        packageElement.innerHTML = `
            <h3>${packageData.packageType} Package</h3>
            <div class="package-price">Ksh ${packageData.price}</div>
            <div class="package-description">${packageData.description}</div>
            <div class="package-details">
                <p>Referrals Required: ${packageData.numberOfReferralsRequired}</p>
                <p>Referrals Made: ${packageData.referralsCount}</p>
                <p>Pay Per View: ${packageData.payPerView} Ksh</p>
                <progress value="${packageData.referralsCount}" max="${packageData.numberOfReferralsRequired}"></progress>
            </div>
            <button class="pay-button" onclick="requestPayment('${packageData.packageType}')">Pay via MPESA</button>
            <div class="package-referral-link">
                <p>Referral Link: <span id="${packageData.packageType.toLowerCase()}-referral-link"></span></p>
                <button onclick="copyReferralLink('${packageData.packageType.toLowerCase()}', '${packageData.packageType.toLowerCase()}-referral-link', '${userId}')">Copy Link</button>
            </div>
            <div id="${packageData.packageType.toLowerCase()}-status"></div>
        `;

        packagesContainer.appendChild(packageElement);
        displayReferralLink(packageData.packageType.toLowerCase(), `${packageData.packageType.toLowerCase()}-referral-link`, userId);
    });
}

// Function to handle MPESA payment request
function requestPayment(packageType) {
    // Redirect to deposit.html for payment processing
    window.location.href = `deposit.html?package=${packageType}`;
}

// Listen for the authenticated user and initialize the app
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        const userId = user.uid; // This is the USER_ID
        console.log('User ID:', userId);

        // Now you can use this userId in your Firestore queries, functions, etc.
        fetchUserPackages(userId);
        updatePackageStatus(userId);
    } else {
        // No user is signed in, handle accordingly (e.g., redirect to login)
        console.log('No user is signed in');
    }
});
