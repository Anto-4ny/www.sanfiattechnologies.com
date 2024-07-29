// Initialize Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  // Your Firebase configuration
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const storage = getStorage(app);

// Display user information
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
            document.getElementById("total-earnings").textContent = userData.views * 5;
        }
    } else {
        // Redirect to login or registration if user is not authenticated
        window.location.href = "/login.html";
    }
});

// Handle screenshot upload
document.getElementById('upload-button').addEventListener('click', async () => {
    const fileInput = document.getElementById('view-screenshot');
    const file = fileInput.files[0];
    if (file) {
        try {
            const user = auth.currentUser;
            const storageRef = ref(storage, `screenshots/${user.uid}/${file.name}`);
            await uploadBytes(storageRef, file);
            const fileURL = await getDownloadURL(storageRef);
            
            // Save file URL and increment views (this is a placeholder, you'll need a real verification system)
            const userDoc = doc(db, "users", user.uid);
            await updateDoc(userDoc, {
                views: userData.views + 1 // This should be replaced with actual view count verification
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
            
