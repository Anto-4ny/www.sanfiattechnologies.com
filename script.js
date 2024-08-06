
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
@@ -18,226 +18,132 @@ const firebaseConfig = {

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const auth = getAuth();
const storage = getStorage(app);
const analytics = getAnalytics(app);

document.addEventListener('DOMContentLoaded', () => {
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
    const registrationContainer = document.getElementById('registration-form-container');
    const loginContainer = document.getElementById('login-form-container');
    const welcomeSection = document.getElementById('welcome-section');
    const welcomeMessage = document.getElementById('welcome-message');

    // Toggle between registration and login forms
    document.getElementById('show-login').addEventListener('click', () => {
      registrationContainer.style.display = 'none';
      loginContainer.style.display = 'block';
    });

    document.getElementById('show-register').addEventListener('click', () => {
      loginContainer.style.display = 'none';
      registrationContainer.style.display = 'block';
    });

    // Toggle password visibility
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
        confirmPasswordInput.type = type;
        toggleConfirmPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
// Function to create a new user document with first and last names
const createUserDocument = async (user) => {
  const userDoc = doc(db, "users", user.uid);
  await setDoc(userDoc, {
    firstName: "John", // Replace with actual data or user input
    lastName: "Doe",   // Replace with actual data or user input
    email: user.email,
    referrals: 0,
    views: 0
  });
};

    // Toggle login password visibility
    toggleLoginPassword.addEventListener('click', () => {
        const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
        loginPasswordInput.type = type;
        toggleLoginPassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
// Function to update user document with new first and last names
const updateUserDocument = async (firstName, lastName) => {
  const user = auth.currentUser;
  const userDoc = doc(db, "users", user.uid);
  await updateDoc(userDoc, {
    firstName: firstName,
    lastName: lastName
  });
};

    // Handle payment button click
    payButton.addEventListener('click', async () => {
        const amount = parseInt(paymentAmountInput.value, 10);
        if (isNaN(amount) || amount !== 200) {
            alert("Please enter a valid amount of 200 Ksh.");
            return;
        }

        try {
            // Send payment request to the server
            const response = await fetch('/api/request-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: 200 })
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
// Handle user authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDoc);

    if (!userSnap.exists()) {
      // Create user document if it does not exist
      await createUserDocument(user);
    }

    const userData = userSnap.exists() ? userSnap.data() : (await getDoc(userDoc)).data();

    document.getElementById("user-name").textContent = `${userData.firstName} ${userData.lastName}`;
    document.getElementById("user-email").textContent = userData.email;
    document.getElementById("referral-count").textContent = userData.referrals;
    document.getElementById("total-views").textContent = userData.views;
    document.getElementById("total-earnings").textContent = (userData.views * 5).toFixed(2);

    // Referral Link
    const referralLink = `https://yourwebsite.com/register?ref=${user.uid}`;
    document.getElementById('referral-link').textContent = referralLink;

    // Copy referral link functionality
    document.getElementById('copy-link-button').addEventListener('click', () => {
      navigator.clipboard.writeText(referralLink).then(() => {
        alert('Referral link copied to clipboard!');
      });
    });

    // Registration form submission
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
            alert("Invalid first name. It must start with a capital letter and contain only letters.");
            return;
        }

        if (!namePattern.test(lastName)) {
            alert("Invalid last name. It must start with a capital letter and contain only letters.");
            return;
        }

        // Validate password complexity
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!passwordPattern.test(password)) {
            alert("Password must be at least 6 characters long, contain both uppercase and lowercase letters, and at least one number. It should not contain special characters like asterisks.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
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
                alert('Invalid payment confirmation code. Please ensure you have paid the correct amount and entered the correct code.');
                return;
            }

            // Check if the email is already registered
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);
            if (signInMethods.length > 0) {
                alert("This email is already in use. Please use a different email or log in.");
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
            registrationContainer.style.display = 'none';
            welcomeSection.style.display = 'block';
        } catch (error) {
            console.error("Error during registration:", error);
            alert("Registration failed. Please try again.");
        }
    });
    // Update WhatsApp share link
    const whatsappShareButton = document.getElementById('whatsapp-share-button');
    whatsappShareButton.href = `https://api.whatsapp.com/send?text=Check%20out%20this%20referral%20link:%20${encodeURIComponent(referralLink)}`;

    // Login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = loginPasswordInput.value;

        try {
            // Sign in with Firebase Authentication
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user document from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                welcomeMessage.textContent = `Welcome back, ${userData.firstName} ${userData.lastName}!`;
                registrationContainer.style.display = 'none';
                loginContainer.style.display = 'none';
                welcomeSection.style.display = 'block';
            } else {
                console.error("No such user document!");
                alert("User data not found. Please contact support.");
            }
        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                alert("Incorrect password. Please try again.");
            } else if (error.code === 'auth/user-not-found') {
                alert("No account found with this email. Please register.");
            } else {
                console.error("Error during login:", error);
                alert("Login failed. Please try again.");
            }
        }
    });
    // Welcome message
    const welcomeMessage = document.getElementById('welcome-message');
    if (userData.referrals < 10) {
      welcomeMessage.textContent = `Welcome to your dashboard! Keep adding referrals to start earning from status views.`;
    } else {
      welcomeMessage.textContent = `Congratulations! You have reached ${userData.referrals} referrals.`;
    }
  } else {
    window.location.href = 'index.html'; // Redirect to login if not authenticated
  }
});

    // Handle user authentication state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDoc);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                document.getElementById("user-name").textContent = `${userData.firstName} ${userData.lastName}`;
                document.getElementById("user-email").textContent = userData.email;
                document.getElementById("referral-count").textContent = userData.referrals;
                document.getElementById("total-views").textContent = userData.views;
                document.getElementById("total-earnings").textContent = (userData.views * 5).toFixed(2);
            }
        } else {
            window.location.href = "index.html";
        }
    });
      document.getElementById('upload-button').addEventListener('click', async () => {
  const viewsCountInput = document.getElementById('views-count');
  const viewsCount = parseInt(viewsCountInput.value, 10);
  const fileInput = document.getElementById('view-screenshot');
  const file = fileInput.files[0];
  const statusMessage = document.getElementById('upload-status');

  if (!viewsCount || isNaN(viewsCount)) {
    statusMessage.textContent = "Please enter a valid number of views.";
    return;
  }

  if (file) {
    // Check file type
    const validFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validFileTypes.includes(file.type)) {
      statusMessage.textContent = "Please upload a valid image file (JPEG, PNG, GIF).";
      return;
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      statusMessage.textContent = "File size must be less than 5MB.";
      return;
    }

    try {
      const user = auth.currentUser;
      const storageRef = ref(storage, `screenshots/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileURL = await getDownloadURL(storageRef);

      // Send email with screenshot and views count
      await fetch('https://your-backend-endpoint/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          viewsCount: viewsCount,
          fileURL: fileURL
        })
      });

      statusMessage.textContent = "Screenshot uploaded successfully! Awaiting validation.";
    } catch (error) {
      console.error("Error uploading file:", error);
      statusMessage.textContent = "Error uploading file. Please try again.";
    }
  } else {
    statusMessage.textContent = "Please select a file to upload.";
  }
});

                  
