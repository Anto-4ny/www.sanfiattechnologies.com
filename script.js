import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    query,
    onSnapshot,
    collection,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7t1wWHhPYBitqKC4SJ8lqP1WMLDefCxo",
    authDomain: "antocap-referrals.firebaseapp.com",
    projectId: "antocap-referrals",
    storageBucket: "antocap-referrals.appspot.com",
    messagingSenderId: "1071760453747",
    appId: "1:1071760453747:web:fafa7ac624ba7452e6fa06",
    measurementId: "G-EPLJB8MTRH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exporting firebase-related modules for use elsewhere in the app
export { auth, db, doc, getDoc, query, collection, where, getDocs, storage, sendPasswordResetEmail };

// Ensure user is authenticated
export const ensureAuthenticated = () => {
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        window.location.href = "index.html"; // Redirect to login page (adjust URL if necessary)
    } else {
        console.log("User is authenticated");
    }
};

// DOM Content Loaded Event Listener
document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const signupSection = document.getElementById("signup-section");
    const loginMessage = document.getElementById("login-message");
    const signupMessage = document.getElementById("signup-message");

    const showSignupButton = document.getElementById("show-signup");
    const showLoginButton = document.getElementById("show-login");

    // Password toggle functionality
    const togglePasswordVisibility = (inputId, toggleId) => {
        const input = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        if (input && toggleIcon) {
            toggleIcon.addEventListener("click", () => {
                const type = input.type === "password" ? "text" : "password";
                input.type = type;
                toggleIcon.classList.toggle("fa-eye");
                toggleIcon.classList.toggle("fa-eye-slash");
            });
        }
    };

    togglePasswordVisibility("login-password", "toggle-login-password");
    togglePasswordVisibility("signup-password", "toggle-signup-password");
    togglePasswordVisibility("confirm-password", "toggle-confirm-password");

    if (showSignupButton) {
        showSignupButton.addEventListener("click", () => {
            loginSection.classList.add("hidden");
            signupSection.classList.remove("hidden");
        });
    }

    if (showLoginButton) {
        showLoginButton.addEventListener("click", () => {
            signupSection.classList.add("hidden");
            loginSection.classList.remove("hidden");
        });
    }

    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value.trim();

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (user) {
                    localStorage.setItem("userEmail", email);
                    // Redirect to dashboard after login
                    window.location.href = "dashboard.html";
                }
            } catch (error) {
                if (loginMessage) {
                    loginMessage.textContent = error.message;
                    loginMessage.classList.add("error");
                }
            }
        });
    }

    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const firstName = document.getElementById("first-name").value.trim();
            const lastName = document.getElementById("last-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value.trim();
            const confirmPassword = document.getElementById("confirm-password").value.trim();
            const referralCode = document.getElementById("referral-code").value.trim();

            if (password !== confirmPassword) {
                if (signupMessage) {
                    signupMessage.textContent = "Passwords do not match.";
                    signupMessage.classList.add("error");
                }
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (user) {
                    // Generate unique referral link
                    const referralLink = `${window.location.origin}/index.html?ref=${user.uid}`;

                    // Save user data to Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        firstName,
                        lastName,
                        email,
                        referralCode,
                        referralLink,
                        paymentStatus: false,
                        amountPaid: 0,
                        totalEarnings: 0,
                        totalReferrals: 0,
                        totalViews: 0,
                        registeredAt: new Date(),
                    });

                    // Redirect to dashboard
                    window.location.href = "dashboard.html";
                }
            } catch (error) {
                if (signupMessage) {
                    signupMessage.textContent = error.message;
                    signupMessage.classList.add("error");
                }
            }
        });
    }
});


// Display referral link and handle sharing
const referralLinkElement = document.getElementById("referral-link");
const copyButton = document.getElementById("copy-link-button");
const whatsappShareButton = document.getElementById("whatsapp-share-button");

const displayReferralLink = (referralLink) => {
    if (referralLinkElement) {
        referralLinkElement.textContent = referralLink;

        if (copyButton) {
            copyButton.addEventListener("click", () => {
                navigator.clipboard
                    .writeText(referralLink)
                    .then(() => alert("Referral link copied to clipboard!"))
                    .catch(() => alert("Failed to copy referral link."));
            });
        }

        if (whatsappShareButton) {
            whatsappShareButton.href = `https://wa.me/?text=Lets Earn Together Buddy: ${referralLink}`;
        }
    }
};

// Load referral link from Firestore if logged in
const loadReferralLink = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const referralLink = userDoc.data().referralLink;
            displayReferralLink(referralLink);
        }
    }
};

loadReferralLink();

// Function to check user's payment status
const checkAuthenticationAndPayment = async () => {
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        // Redirect to login if no email is found in localStorage
        if (!window.location.pathname.includes("index.html")) {
            window.location.href = "index.html";
        }
        return;
    }

    try {
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.paymentStatus) {
                console.log("You have paid.");
                localStorage.setItem("paymentStatus", "paid");
            } else {
                console.log("You have not paid. Redirecting to payment pop-up...");
                localStorage.setItem("paymentStatus", "not-paid");
                if (!window.location.pathname.includes("dashboard.html")) {
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

// Ensure user authentication and handle payment status
auth.onAuthStateChanged(async (user) => {
    if (user) {
        localStorage.setItem("userEmail", user.email);
        await checkAuthenticationAndPayment();
    } else {
        if (!window.location.pathname.includes("index.html")) {
            window.location.href = "index.html";
        }
    }
});


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

// Function to fetch and update balance
const fetchUpdatedBalance = async (user) => {
    const balanceElement = document.getElementById('balance-amount');
    if (!user || !balanceElement) return;

    try {
        // Fetch user document from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            const balance = userData.balance || 0; // Get the balance field, default to 0 if not present
            balanceElement.textContent = `${balance} Ksh`;
        } else {
            balanceElement.textContent = '0 Ksh'; // Default to 0 if user document doesn't exist
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        balanceElement.textContent = 'Error fetching balance';
    }
};

// Real-time updates from Firestore
const listenForUpdates = (userId) => {
    const userDocRef = doc(db, 'users', userId);
    onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            userData.email = docSnapshot.id; // Ensure email matches the document ID
            updateDashboard(userData);
            fetchUpdatedBalance(docSnapshot.id); // Re-fetch balance with real-time updates
        } else {
            console.error('User data does not exist');
        }
    });
};

// Firebase authentication state listener
onAuthStateChanged(auth, async (user) => {
    if (!auth || !db) {
        console.error('Firebase auth or db not initialized.');
        return;
    }

    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'block';

    if (user) {
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userSnapshot = await getDoc(userDocRef);

            if (userSnapshot.exists()) {
                const userData = userSnapshot.data();
                userData.email = user.email; // Add email from auth
                updateDashboard(userData); // Update dashboard
                fetchUpdatedBalance(user); // Fetch balance when user is authenticated
            } else {
                updateDashboard({ email: user.email }); // Basic fallback
            }

            listenForUpdates(user.uid); // Listen for real-time updates from Firestore
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    } else {
        const loginSection = document.getElementById('login-section');
        if (loginSection) loginSection.scrollIntoView({ behavior: 'smooth' });
    }
});

// Periodic refresh (Optional, if you want to keep the balance updated automatically)
document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => {
        const user = auth.currentUser;
        if (user) {
            fetchUpdatedBalance(user); // Re-fetch the balance periodically, e.g., every 10 seconds
        }
    }, 10000); // Refresh every 10 seconds
});
     

// Function to update balance
const updateBalance = async () => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDocRef);
  
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          const balanceElement = document.querySelector("#balance-section span");
          if (balanceElement) {
            balanceElement.textContent = `Balance: ${userData.balance || 0} Ksh`;
          }
        }
      }
    });
  };
  
  // Function to update notifications
  const updateNotifications = async () => {
    const notificationsContainer = document.getElementById("notifications-container");
    const notificationCount = document.getElementById("notification-count");
  
    if (!notificationsContainer || !notificationCount) return;
  
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        const notificationsRef = doc(db, "users", userId); // Assuming notifications are stored in user data
        const userSnapshot = await getDoc(notificationsRef);
  
        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          const notifications = userData.notifications || [];
          notificationsContainer.innerHTML = ""; // Clear previous notifications
  
          notifications.forEach((notification, index) => {
            const notificationItem = document.createElement("div");
            notificationItem.classList.add("notification-item");
            notificationItem.id = `notification-${index}`;
            notificationItem.innerHTML = `
              <p>${notification.message}</p>
              <span class="close-notification-btn" onclick="document.getElementById('notification-${index}').remove()">&times;</span>
            `;
            notificationsContainer.appendChild(notificationItem);
          });
  
          notificationCount.textContent = notifications.length;
        }
      }
    });
  };
  
  // Call these functions when the page loads
  window.addEventListener("DOMContentLoaded", () => {
    updateBalance();
    updateNotifications();
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

// Toggle Mobile Navigation when hamburger icon is clicked
hamburgerIcon.addEventListener("click", () => {
  // Toggle 'open' class to show or hide the mobile navigation
  mobileNav.classList.toggle("open");

  // Toggle overlay visibility
  overlay.style.display = mobileNav.classList.contains("open") ? "block" : "none";

  // Add animation order to links
  document.querySelectorAll(".mobile-nav a").forEach((link, index) => {
    link.style.setProperty("--order", index);
  });
});

// Close mobile navigation when clicking on overlay or anywhere outside it
document.addEventListener("click", (e) => {
  const target = e.target;

  // Check if the click is outside the mobile navigation and hamburger icon
  if (
    !mobileNav.contains(target) && // Click is outside the mobile navigation
    !hamburgerIcon.contains(target) && // Click is outside the hamburger icon
    mobileNav.classList.contains("open") // Mobile navigation is open
  ) {
    // Remove 'open' class to hide the mobile navigation
    mobileNav.classList.remove("open");

    // Hide the overlay
    overlay.style.display = "none";
  }
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
