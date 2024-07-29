// Initialize Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

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
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Form elements
const registrationForm = document.getElementById('registration-form');
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

// Registration form submission
registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const paymentConfirmation = document.getElementById('payment-confirmation').value;

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            paymentConfirmation: paymentConfirmation,
            referrals: 0,
            views: 0,
            createdAt: new Date()
        });

        welcomeMessage.textContent = `Welcome, ${name}!`;
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        welcomeSection.style.display = 'block';
    } catch (error) {
        console.error("Error during registration:", error);
        alert("Registration failed. Please try again.");
    }
});

// Login form submission
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        welcomeMessage.textContent = `Welcome back, ${userData.name}!`;
        registrationContainer.style.display = 'none';
        loginContainer.style.display = 'none';
        welcomeSection.style.display = 'block';
    } catch (error) {
        console.error("Error during login:", error);
        alert("Login failed. Please try again.");
    }
});

// Redirect to login if not authenticated
const checkAuthStatus = () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, show dashboard
            window.location.href = "dashboard.html";
        } else {
            // User is not signed in, show registration/login
            window.location.href = "index.html";
        }
    });
};

// Call this function on page load to ensure authentication
checkAuthStatus();
      
