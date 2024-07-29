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
        document.getElementById("user-name").textContent = userData.name;
        document.getElementById("user-email").textContent = userData.email;
        document.getElementById("referral-count").textContent = userData.referrals;
        document.getElementById("total-views").textContent = userData.views;
        document.getElementById("total-earnings").textContent = (userData.views * 5).toFixed(2);
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
      // Check file type
      const validFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validFileTypes.includes(file.type)) {
        alert("Please upload a valid image file (JPEG, PNG, GIF).");
        return;
      }

      // Check file size (limit to 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("File size must be less than 5MB.");
        return;
      }

      try {
        const user = auth.currentUser;
        const storageRef = ref(storage, `screenshots/${user.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        const fileURL = await getDownloadURL(storageRef);

        // Save file URL and increment views (this is a placeholder, you'll need a real verification system)
        const userDoc = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDoc);
        const userData = userSnap.data();
        
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

                            
