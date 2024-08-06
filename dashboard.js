// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-analytics.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

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
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth();
const storage = getStorage(app);

// Handle user authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userDoc = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDoc);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      // Display full name
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

      // Update WhatsApp share link
      const whatsappShareButton = document.getElementById('whatsapp-share-button');
      whatsappShareButton.href = `https://api.whatsapp.com/send?text=Check%20out%20this%20referral%20link:%20${encodeURIComponent(referralLink)}`;

      // Welcome message
      const welcomeMessage = document.getElementById('welcome-message');
      if (userData.referrals < 10) {
        welcomeMessage.textContent = `Welcome to your dashboard! Keep adding referrals to start earning from status views.`;
      } else {
        welcomeMessage.textContent = `Congratulations! You have reached ${userData.referrals} referrals.`;
      }
    } else {
      console.error("No such user document!");
      alert("User data not found. Please contact support.");
    }
  } else {
    window.location.href = 'index.html'; // Redirect to login if not authenticated
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
        
