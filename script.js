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
    togglePasswordVisibility(document.getElementById('login-password'), toggleLoginPassword);
    togglePasswordVisibility(document.getElementById('signup-password'), toggleSignupPassword);
    togglePasswordVisibility(document.getElementById('confirm-password'), toggleConfirmPassword);

    // Handle login form submission
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Retrieve and save user email in localStorage
            localStorage.setItem('userEmail', user.email);

            window.location.href = 'dashboard.html'; // Redirect to dashboard if login is successful
        } catch (error) {
            loginMessage.textContent = error.message;
            loginMessage.classList.add('error');
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
            signupMessage.classList.add('error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: `${firstName} ${lastName}` });

            await setDoc(doc(db, 'users', user.uid), {
                firstName,
                lastName,
                email,
                paymentStatus: false
            });

            // Save user email in localStorage
            localStorage.setItem('userEmail', email);

            window.location.href = 'dashboard.html'; // Redirect after successful registration
        } catch (error) {
            signupMessage.textContent = error.message;
            signupMessage.classList.add('error');
        }
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
});


const updateDashboard = (userData) => {
    const firstNameElement = document.getElementById('firstName');
    const userEmailElement = document.getElementById('user-email');
    const referralCountElement = document.getElementById('referral-count');
    const totalViewsElement = document.getElementById('total-views');
    const totalEarningsElement = document.getElementById('total-earnings');
    const amountPaidElement = document.getElementById('amount-paid');
    const packageStatusElement = document.getElementById('package-status');

    if (userData) {
        if (firstNameElement) firstNameElement.textContent = userData.firstName || 'No name';
        if (userEmailElement) userEmailElement.textContent = userData.email || 'No email';
        if (referralCountElement) referralCountElement.textContent = userData.referrals || 0;
        if (totalViewsElement) totalViewsElement.textContent = userData.totalViews || 0;
        if (totalEarningsElement) totalEarningsElement.textContent = userData.totalEarnings || '0 Ksh';
        if (amountPaidElement) amountPaidElement.textContent = userData.amountPaid ? `${userData.amountPaid} Ksh` : '0 Ksh';
        if (packageStatusElement) packageStatusElement.textContent = userData.packageStatus || 'No active package';

        updateProgressBar('#referral-box', (userData.referrals || 10) * 10);
        updateProgressBar('#views-box', (userData.totalViews || 100) * 2);
        updateProgressBar('#earnings-box', (userData.totalEarnings || 100) / 100);
        updateProgressBar('#amount-box', (userData.amountPaid || 100) / 100);
    }
};

function updateProgressBar(elementId, percentage) {
    const progressBar = document.querySelector(elementId);
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!auth || !db) {
        console.error("Firebase auth or db not initialized.");
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
                    userData.email = user.email; 
                    updateDashboard(userData);
                } else {
                    updateDashboard({ email: user.email });
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
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

document.addEventListener("DOMContentLoaded", () => {
    const balanceElement = document.getElementById("balance-amount");

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

    document.addEventListener('DOMContentLoaded', async function () {
        const referralLinkElement = document.getElementById('referral-link');
        const copyButton = document.getElementById('copy-link-button');
        const whatsappShareButton = document.getElementById('whatsapp-share-button');
        const tbody = document.querySelector('#referrals-section tbody');
    
        firebase.auth().onAuthStateChanged(async function (user) {
            if (user) {
                const email = user.email;
    
                try {
                    // Fetch user data
                    const userDoc = await firebase.firestore().collection('users').doc(email).get();
                    if (userDoc.exists) {
                        const userReferralCode = userDoc.data().referralCode;
                        const referralLink = `https://www-sanfiattechnologies-com.vercel.app/signup?referral=${userReferralCode}`;
                        referralLinkElement.textContent = referralLink;
    
                        // Copy Link Functionality
                        copyButton.addEventListener('click', function () {
                            navigator.clipboard.writeText(referralLink).then(() => {
                                alert('Referral link copied to clipboard!');
                            });
                        });
    
                        // WhatsApp Sharing Functionality
                        whatsappShareButton.addEventListener('click', function (e) {
                            e.preventDefault();
                            const message = `Hey, sign up using my referral link: ${referralLink} and enjoy the benefits of earning with me at Sanfiat Technologies!`;
                            const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
                            window.open(whatsappURL, '_blank');
                        });
    
                        // Fetch Referred Users
                        const response = await fetch(`/get-referrals?email=${email}`);
                        const referrals = await response.json();
    
                        tbody.innerHTML = ''; // Clear existing rows
                        if (response.ok && referrals.length > 0) {
                            referrals.forEach(referral => {
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td style="padding: 8px; border: 1px solid #ddd;">${referral.email}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; color: green;">Ksh ${referral.paidAmount || 0}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; color: red;">Ksh ${referral.notPaid || 0}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                                        ${referral.isActive ? '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : ''}
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                                        ${!referral.isActive ? '<i class="fas fa-times-circle" style="color: #dc3545;"></i>' : ''}
                                    </td>
                                `;
                                tbody.appendChild(row);
                            });
                        } else {
                            tbody.innerHTML = `<tr><td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: center;">No referrals found</td></tr>`;
                        }
                    } else {
                        alert('Failed to fetch referral data.');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    tbody.innerHTML = `<tr><td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: center;">Error fetching referral data.</td></tr>`;
                }
            } else {
                alert('Please log in to access your referral link.');
            }
        });
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
