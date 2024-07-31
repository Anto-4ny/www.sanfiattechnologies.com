// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";

// Your web app's Firebase configuration
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
const db = getFirestore(app);
const auth = getAuth(app);
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

            document.getElementById('welcome-message').textContent = `Welcome, ${firstName}!`;
            document.getElementById('registration-form-container').style.display = 'none';
            document.getElementById('welcome-section').style.display = 'block';
        } catch (error) {
            console.error("Error during registration:", error);
            alert("Registration failed. Please try again.");
        }
    });
});
  
              
  
    // Login form submission
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
  
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
  
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          welcomeMessage.textContent = `Welcome back, ${userData.name}!`;
          registrationContainer.style.display = 'none';
          loginContainer.style.display = 'none';
          welcomeSection.style.display = 'block';
        } else {
          console.error("No such user document!");
        }
      } catch (error) {
        console.error("Error during login:", error);
        alert("Login failed. Please try again.");
      }
    });
  
    // Handle user authentication state
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          document.getElementById("user-name").textContent = userData.name;
          document.getElementById("user-email").textContent = userData.email;
          document.getElementById("referral-count").textContent = userData.referrals;
          document.getElementById("total-views").textContent = userData.views;
          document.getElementById("total-earnings").textContent = (userData.views * 5).toFixed(2);
        }
      } else {
        window.location.href = "index.html";
      }
    });
  });
  
// Handle screenshot upload
document.getElementById('upload-button').addEventListener('click', async () => {
  const fileInput = document.getElementById('view-screenshot');
  const file = fileInput.files[0];
  
  if (file) {
    const validFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validFileTypes.includes(file.type)) {
      alert("Please upload a valid image file (JPEG, PNG, GIF).");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("File size must be less than 5MB.");
      return;
    }

    try {
      const user = auth.currentUser;
      const storageRef = ref(storage, `screenshots/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileURL = await getDownloadURL(storageRef);

      const userDoc = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDoc);
      const userData = userSnap.data();
      
      await updateDoc(userDoc, {
        views: userData.views + 1 // Placeholder, replace with actual view count verification
      });

      alert("Screenshot uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please try again.");
    }
  } else {
    alert("Please select a file to upload.");
  }
});
