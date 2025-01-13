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
    addDoc,
    updateDoc,
    getDoc,
    query,
    onSnapshot,
    collection,
    where,
    getDocs,
    Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
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
        window.location.href = "index"; // Redirect to login page (adjust URL if necessary)
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
                    window.location.href = "dashboard";
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
                    const referralLink = `${window.location.origin}/index?ref=${user.uid}`;

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
        if (!window.location.pathname.includes("index")) {
            window.location.href = "index";
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
                if (!window.location.pathname.includes("dashboard")) {
                    window.location.href = "dashboard";
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
        if (!window.location.pathname.includes("index")) {
            window.location.href = "index";
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

// Product images URLs
const productImages = [
    'images/product/Photo_1722099289583.png', // Day 1
    'images/product/Photo_1722099967640.png', // Day 2
    'images/product/Photo_1722099289583.png', // Day 3
    'images/product/Photo_1722100171247.png', // Day 4
    'images/product/Photo_1722099289583.png', // Day 5
    'images/product/Photo_1722099289583.png', // Day 6
    'images/product/Photo_1722099289583.png'  // Day 7
];

// Logic to rotate product based on the current day
const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

for (let i = 0; i < 7; i++) {
    const productImageElement = document.getElementById(`product-image-${i+1}`);
    const downloadLinkElement = document.getElementById(`download-image-${i+1}`);
    const whatsappShareElement = document.getElementById(`whatsapp-share-${i+1}`);

    const productImageUrl = productImages[(dayOfWeek + i) % 7]; // Rotate images based on day of the week

    // Set image source
    productImageElement.src = productImageUrl;

    // Set download link
    downloadLinkElement.href = productImageUrl;

    // Set WhatsApp sharing functionality
    whatsappShareElement.addEventListener("click", (e) => {
        e.preventDefault();

        // Provide a caption for the image
        const caption = `Visit Sanfiat to earn with me by posting on WhatsApp: https://sanfiat.antocapteknologies.com/`;

        // Notify the user to download and share the image manually
        alert("To share this image on WhatsApp:\n1. Download the image.\n2. Open WhatsApp and upload the image.\n3. Add this caption:\n\n" + caption);

        // Trigger download to make it easier for users
        downloadLinkElement.click();
    });
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
    const baseUrl = "https://sanfiat.antocapteknologies.com/packages/";  // Replace with your actual base URL
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
                <p>Pay Per View: ${packageData.payPerView} Ksh</p>
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
    window.location.href = `deposit?package=${packageType}`;
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

// Validate view count
const validateViews = (views) => views >= 5 && views <= 20;

// Check if a user has uploaded in the last 24 hours
const checkUploadCooldown = async (userId) => {
  const uploadsRef = collection(db, "uploads");
  const oneDayAgo = Timestamp.fromDate(new Date(Date.now() - 86400000)); // 24 hours ago
  const q = query(uploadsRef, where("userId", "==", userId), where("timestamp", ">", oneDayAgo));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Handle file input and drag-and-drop
document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const filePreview = document.getElementById("file-preview");

  if (dropZone && fileInput && filePreview) {
    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (event) => {
      const files = event.target.files;
      handleFileSelection(files, filePreview);
    });

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.style.borderColor = "#007BFF";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#ccc";
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.style.borderColor = "#ccc";
      const files = event.dataTransfer.files;
      fileInput.files = files;
      handleFileSelection(files, filePreview);
    });
  } else {
    console.error("One or more required elements are missing in the DOM.");
  }
});

// Handle file selection
const handleFileSelection = (files, filePreview) => {
  if (files.length > 0) {
    const file = files[0];
    filePreview.textContent = `Selected file: ${file.name}`;
    filePreview.style.color = "#333";

    if (!file.type.startsWith("image/")) {
      filePreview.textContent = "Please upload a valid image file.";
      filePreview.style.color = "red";
    }
  } else {
    filePreview.textContent = "No file selected.";
    filePreview.style.color = "#777";
  }
};

// Check user authentication and upload logic
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userId = user.uid;

    // Check user package status
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().packageStatus) {
      alert("You must purchase a package to upload screenshots.");
      return;
    }

    // Check if the user has uploaded in the last 24 hours
    const hasUploaded = await checkUploadCooldown(userId);

    if (hasUploaded) {
      alert("You can only upload one screenshot every 24 hours.");
      return;
    }

    // Upload form submission logic
    const uploadForm = document.getElementById("upload-form");
    if (uploadForm) {
      uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const views = parseInt(document.getElementById("views").value, 10);
        const screenshot = document.getElementById("file-input").files[0];

        if (!validateViews(views)) {
          alert("Number of views must be between 5 and 20.");
          return;
        }

        if (!screenshot) {
          alert("Please upload a screenshot.");
          return;
        }

        const uploadData = {
          userId,
          views,
          screenshotName: screenshot.name,
          timestamp: Timestamp.now(),
          approved: false,
        };

        try {
          await addDoc(collection(db, "uploads"), uploadData);
          alert("Screenshot uploaded successfully! Awaiting admin approval.");
        } catch (error) {
          console.error("Error uploading screenshot:", error);
          alert("Error uploading screenshot. Please try again.");
        }
      });
    }
  } else {
    alert("You must be logged in to upload a screenshot.");
  }
});

// Listen for admin approvals and update user data
const listenForApprovals = () => {
  const uploadsRef = collection(db, "uploads");
  const q = query(uploadsRef, where("approved", "==", true));

  onSnapshot(q, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const approvedUpload = change.doc.data();
        const userId = approvedUpload.userId;

        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedData = {
            totalViews: (userData.totalViews || 0) + approvedUpload.views,
            totalEarnings: (userData.totalEarnings || 0) + 200,
            balance: (userData.balance || 0) + 200,
          };

          await updateDoc(userDocRef, updatedData);
          addNotification("Your screenshot has been approved! Earnings and balance updated.");
        }
      }
    });
  });
};

// Add notification to the DOM
const addNotification = (message) => {
  const notificationsContainer = document.getElementById("notifications-container");
  const notificationCount = document.getElementById("notification-count");

  const notification = document.createElement("div");
  notification.classList.add("notification-item");
  notification.innerHTML = `
    <p>${message}</p>
    <span class="close-notification-btn" onclick="this.parentElement.remove()">&times;</span>
  `;

  notificationsContainer.appendChild(notification);

  if (notificationCount) {
    const currentCount = parseInt(notificationCount.textContent, 10) || 0;
    notificationCount.textContent = currentCount + 1;
  }
};

// Fetch notifications
const fetchNotifications = async (userId) => {
  const notificationsRef = collection(doc(db, "users", userId), "notifications");
  const notificationsSnapshot = await getDocs(notificationsRef);
  const notificationsContainer = document.getElementById("notifications-container");

  notificationsSnapshot.forEach((doc) => {
    const notificationData = doc.data();
    const notificationElement = document.createElement("div");
    notificationElement.classList.add("notification-item");
    notificationElement.innerHTML = `
      <p>${notificationData.message}</p>
      <button onclick="closeNotification('${doc.id}')">Close</button>
    `;
    notificationsContainer.appendChild(notificationElement);
  });
};

// Close a notification
const closeNotification = async (notificationId) => {
  const notificationsRef = doc(db, "users", userId, "notifications", notificationId);
  await deleteDoc(notificationsRef);
  location.reload();
};

// Start listening for approvals
listenForApprovals();