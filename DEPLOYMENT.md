# U-PetFinder Deployment Guide

## 🚀 Quick Start

### Option 1: Deploy to Firebase Hosting (Recommended)

1. **Install Firebase CLI** (already installed)
   ```powershell
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```powershell
   firebase login
   ```

3. **Initialize Firebase** (choose Hosting, Firestore, Storage)
   ```powershell
   firebase init hosting
   firebase init firestore
   firebase init storage
   ```

4. **Configure Firebase Project**
   - Edit `firebase.json` with your Firebase project settings
   - Update `src/firebase.js` with your Firebase project credentials

5. **Deploy**
   ```powershell
   npm run deploy
   ```

### Option 2: Deploy to GitHub Pages

1. **Login to GitHub CLI**
   ```powershell
   gh auth login
   ```

2. **Create Repository**
   ```powershell
   gh repo create upetfinder --public --source . --remote origin
   ```

3. **Enable GitHub Pages**
   ```powershell
   gh api -X POST repos/upetfinder/upetfinder/pages -f build_type=workflow
   ```

4. **Push to GitHub**
   ```powershell
   git push origin main
   ```

5. **Verify Deployment**
   - Visit: `https://upetfinder.github.io/upetfinder/`

---

## 🔧 Configuration Required

### Firebase Configuration

Edit `src/firebase.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Firebase Console Setup

1. **Create Firebase Project** at https://console.firebase.google.com
2. **Enable Authentication** (Email/Password, Google OAuth)
3. **Create Firestore Database** (start in test mode)
4. **Create Storage Bucket** (select UAE region: me-central1)
5. **Copy Configuration** to `src/firebase.js`

---

## 📱 Local Development

```powershell
npm run dev
```

Visit: `http://localhost:5173`

---

## 🎯 Features Implemented

✅ Immersive Landing Page with COCO 3D Agent  
✅ Lost & Found Board with Advanced Filtering  
✅ Secure Listing Composer with EXIF Stripping  
✅ UAE Privacy Compliance (Federal Decree-Law No. 45 of 2021)  
✅ Glassmorphism UI Design  
✅ PWA Support  
✅ Firebase Integration Ready  

---

## 🔒 Privacy & Security

- **EXIF Stripping**: All uploaded images have metadata stripped client-side
- **Privacy-Protected Chat**: No personal data shared publicly
- **UAE Data Residency**: Firebase Storage configured for UAE region
- **Consent Forms**: Explicit location sharing consent required

---

## 📞 Support

Contact: prasant.aakriti@gmail.com

---

## 📝 License

© 2025 AAKRITI Network - UAE
