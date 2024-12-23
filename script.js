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

export { db, auth, doc, getDoc };

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

    // Function to toggle password visibility
    const togglePasswordVisibility = (input, eyeIcon) => {
        eyeIcon.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;

            // Toggle Font Awesome classes
            if (type === 'password') {
                eyeIcon.classList.remove('fa-eye-slash');
                eyeIcon.classList.add('fa-eye');
            } else {
                eyeIcon.classList.remove('fa-eye');
                eyeIcon.classList.add('fa-eye-slash');
            }
        });
    };

    // Add password visibility togglers
    togglePasswordVisibility(document.getElementById('login-password'), toggleLoginPassword);
    togglePasswordVisibility(document.getElementById('signup-password'), toggleSignupPassword);
    togglePasswordVisibility(document.getElementById('confirm-password'), toggleConfirmPassword);

    // Handle login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save user email in localStorage for session persistence
            localStorage.setItem('userEmail', user.email);

            // Redirect to the dashboard
            window.location.href = '/dashboard';
        } catch (error) {
            loginMessage.textContent = error.message;
            loginMessage.classList.add('error');
        }
    });

    // Handle signup form submission
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();
        const referralCode = document.getElementById('referral-code').value.trim();

        if (password !== confirmPassword) {
            signupMessage.textContent = 'Passwords do not match.';
            signupMessage.classList.add('error');
            return;
        }

        try {
            // Send user data to the backend for registration
            const response = await fetch('/register-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password, referralCode }),
            });

            const result = await response.json();

            if (response.ok) {
                signupMessage.textContent = 'Signup successful! Your referral link has been created.';
                signupMessage.classList.add('success');

                // Display referral link
                alert(`Your referral link: ${window.location.origin}/signup?ref=${result.referralCode}`);

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
            } else {
                throw new Error(result.error || 'Signup failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during signup:', error);
            signupMessage.textContent = error.message;
            signupMessage.classList.add('error');
        }
    });

    // Populate referral code if accessed via referral link
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get('referral');
    if (referralCode) {
        document.getElementById('referral-code').value = referralCode;
    }

    // Load referral details on the dashboard
    const referralLinkElement = document.getElementById('referral-link');
    const copyButton = document.getElementById('copy-link-button');
    const whatsappShareButton = document.getElementById('whatsapp-share-button');
    const referredUsersList = document.getElementById('referred-users-list');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Fetch referral details from backend
                const response = await fetch(`/get-referrals?email=${user.email}`);
                const referrals = await response.json();

                if (response.ok) {
                    const referralLink = `https://www-sanfiattechnologies-com.vercel.app/signup?referral=${referrals.referralCode}`;
                    referralLinkElement.textContent = referralLink;

                    // Add copy functionality
                    copyButton.addEventListener('click', () => {
                        navigator.clipboard
                            .writeText(referralLink)
                            .then(() => alert('Referral link copied to clipboard!'))
                            .catch(() => alert('Failed to copy referral link.'));
                    });

                    // Set WhatsApp share link
                    whatsappShareButton.href = `https://wa.me/?text=Join via my referral link: ${referralLink}`;

                    // Populate referred users list
                    referredUsersList.innerHTML = referrals.map(
                        (ref) =>
                            `<tr>
                                <td>${ref.email}</td>
                                <td>${ref.isActive ? 'Paid' : 'Not Paid'}</td>
                             </tr>`
                    ).join('');
                } else {
                    throw new Error('Failed to load referral details.');
                }
            } catch (err) {
                console.error('Error fetching referral details:', err);
            }
        } else {
            alert('Please log in to view your referral details.');
        }
    });
});

 
// Check and update payment status
const checkPaymentStatus = async () => {
    const userEmail = localStorage.getItem("userEmail");

    // Redirect only if user is authenticated and on the correct page
    if (!userEmail) {
        if (window.location.pathname.includes("dashboard.html")) {
            window.location.href = "index.html"; // Redirect to login only on dashboard
        }
        return;
    }

    try {
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const paymentStatus = userDoc.data().paymentStatus;

            if (paymentStatus === "paid") {
                localStorage.setItem("paymentStatus", "paid");
            } else {
                localStorage.setItem("paymentStatus", "not-paid");
                if (!window.location.pathname.includes("dashboard.html")) {
                    // Redirect to dashboard only if not already there
                    window.location.href = "dashboard.html";
                }
            }
        } else {
            console.error("User document not found.");
        }
    } catch (error) {
        console.error("Error checking payment status:", error);
    }
};

// Only check payment status if not on index.html
if (!window.location.pathname.includes("index.html")) {
    checkPaymentStatus();
}



// Function to update the dashboard dynamically
const updateDashboard = (userData) => {
    const firstNameElement = document.getElementById('firstName');
    const userEmailElement = document.getElementById('user-email');
    const referralCountElement = document.getElementById('referral-count');
    const totalViewsElement = document.getElementById('total-views');
    const totalEarningsElement = document.getElementById('total-earnings');
    const amountPaidElement = document.getElementById('amount-paid');
    const packageStatusElement = document.getElementById('package-status');

    if (userData) {
        // Populate user data
        if (firstNameElement) firstNameElement.textContent = userData.firstName || 'No name';
        if (userEmailElement) userEmailElement.textContent = userData.email || 'No email';
        if (referralCountElement) referralCountElement.textContent = userData.referrals || 0;
        if (totalViewsElement) totalViewsElement.textContent = userData.totalViews || 0;
        if (totalEarningsElement) totalEarningsElement.textContent = `${userData.totalEarnings || 0} Ksh`;
        if (amountPaidElement) amountPaidElement.textContent = `${userData.amountPaid || 0} Ksh`;
        if (packageStatusElement) packageStatusElement.textContent = userData.packageStatus || 'No active package';

        // Update progress bars
        updateProgressBar('#referral-progress', (userData.referrals || 0) * 10); // Example: 1 referral = 10%
        updateProgressBar('#views-progress', Math.min((userData.totalViews || 0) * 2, 100)); // Example: max 100%
        updateProgressBar('#earnings-progress', Math.min((userData.totalEarnings || 0) / 100, 100)); // Example: max 100%
        updateProgressBar('#amount-progress', Math.min((userData.amountPaid || 0) / 100, 100)); // Example: max 100%
    }
};

// Function to update a specific progress bar
function updateProgressBar(elementId, percentage) {
    const progressBar = document.querySelector(elementId);
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
}

// Firebase authentication state listener
onAuthStateChanged(auth, async (user) => {
    if (!auth || !db) {
        console.error('Firebase auth or db not initialized.');
        return;
    }

    const fetchAndUpdateUserData = async (user) => {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'block';

        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userSnapshot = await getDoc(userDocRef);

                if (userSnapshot.exists()) {
                    const userData = userSnapshot.data();
                    userData.email = user.email; // Add email from auth
                    updateDashboard(userData);
                } else {
                    updateDashboard({ email: user.email }); // Basic fallback
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                if (loadingElement) loadingElement.style.display = 'none';
            }
        } else {
            const loginSection = document.getElementById('login-section');
            if (loginSection) loginSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    fetchAndUpdateUserData(user);
});

// Periodic fetch of updated balance
document.addEventListener('DOMContentLoaded', () => {
    const balanceElement = document.getElementById('balance-amount');

    function fetchUpdatedBalance() {
        fetch('/api/payment-status')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch balance');
                return response.json();
            })
            .then(data => {
                if (data.newBalance) {
                    balanceElement.textContent = `${data.newBalance} Ksh`;
                } else {
                    balanceElement.textContent = '0 Ksh';
                }
            })
            .catch(error => {
                console.error('Error fetching balance:', error);
                balanceElement.textContent = 'Error fetching balance';
            });
    }

    if (balanceElement) fetchUpdatedBalance();
});
              

// Automatic pop-in effect on page load
document.addEventListener('DOMContentLoaded', function () {
    const paymentBox = document.querySelector('.payment-box');
    const confirmationBox = document.querySelector('.confirmation-box');
    const infoBoxes = document.querySelectorAll('.info-box');

    if (paymentBox) paymentBox.classList.add('visible');
    if (confirmationBox) confirmationBox.classList.add('visible');
    infoBoxes.forEach(box => {
        box.classList.add('show');
    });


// DOM Elements
const hamburgerIcon = document.getElementById("hamburger-icon");
const mobileNav = document.getElementById("mobile-nav");
const overlay = document.getElementById("overlay");

// Toggle Mobile Navigation
hamburgerIcon.addEventListener("click", () => {
  mobileNav.classList.toggle("open");
  overlay.style.display = mobileNav.classList.contains("open") ? "block" : "none";

  // Add animation order to links
  document.querySelectorAll(".mobile-nav a").forEach((link, index) => {
    link.style.setProperty("--order", index);
  });
});

// Close Navigation on Overlay Click
overlay.addEventListener("click", () => {
  mobileNav.classList.remove("open");
  overlay.style.display = "none";
});

// Handle Submenu Toggle
document.querySelectorAll(".has-submenu").forEach((submenuToggle) => {
  submenuToggle.addEventListener("click", (e) => {
    e.preventDefault();
    const submenu = submenuToggle.nextElementSibling;
    submenu.classList.toggle("show-submenu");
    submenuToggle.classList.toggle("active");
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
});