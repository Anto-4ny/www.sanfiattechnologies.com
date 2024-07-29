// Initialize Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  // Your Firebase configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Registration Form Submission
document.getElementById('registration-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const payment = document.getElementById('payment').value;

    try {
        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, "defaultPassword");
        const userId = userCredential.user.uid;

        // Save user info to Firestore
        await setDoc(doc(db, "users", userId), {
            name: name,
            email: email,
            payment: payment,
            referrals: 0,
            views: 0,
        });

        alert("Registration successful! You can now start referring.");
    } catch (error) {
        console.error("Error during registration:", error);
        alert("Error during registration. Please try again.");
    }
});
  
