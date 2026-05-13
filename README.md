# 🌐 Accident Analysis Frontend (Next.js)

## 📌 Overview

This repository contains the frontend for the **Accident Analysis Project**.
It allows users to upload vehicle images and view predictions (vehicle type + confidence) returned by the backend API.

---

## 🛠️ Tech Stack

* Next.js (React framework)
* Axios / Fetch API (HTTP requests)
* Tailwind CSS (styling)
* React Hooks (state management)

---

## 📁 Project Structure

```id="m8a2kx"
accident-analysis-frontend/
│
├── pages/
│   ├── index.js              # Main UI (upload + result)
│   └── _app.js               # Global config
│
├── components/
│   ├── Upload.js             # Image upload component
│   ├── Result.js             # Prediction display
│   └── Loader.js             # Loading spinner
│
├── services/
│   └── api.js                # API calls to backend
│
├── styles/
│   └── globals.css
│
├── public/
│   └── assets/               # Static images/icons
│
├── package.json
├── next.config.js
└── README.md
```

---

## 🔄 App Workflow

```id="z1v6pb"
User → Upload Image
     → Frontend sends POST request (/predict)
     → Backend processes image
     → Response received (class + confidence)
     → Display result on UI
```

---

## 🚀 Installation & Setup

### 1. Clone Repository

```id="mqxqrm"
git clone <your-repo-url>
cd accident-analysis-frontend
```

### 2. Install Dependencies

```id="b7ehvp"
npm install
```

### 3. Run Development Server

```id="k8k5i6"
npm run dev
```

### 4. Open in Browser

```id="ckb85h"
http://localhost:3000
```

---

## 📡 Backend Connection

Update API base URL inside:

```id="1bn4p7"
services/api.js
```

Example:

```javascript id="l6w98y"
const BASE_URL = "http://127.0.0.1:8000";

export const predictImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  });

  return res.json();
};
```

---

## 🧑‍💻 Core Components

### Upload Component

* Accepts image input
* Triggers API call

### Result Component

* Displays:

  * Predicted class
  * Confidence score

### Loader Component

* Shows loading state during API call

---

## 🎨 UI Features

* Simple drag-and-drop upload (optional enhancement)
* Real-time prediction display
* Responsive layout
* Clean minimal interface

---

## 🧩 Future Improvements

* Drag & drop upload UI
* Image preview before upload
* Confidence bar visualization
* Multi-image batch upload
* History of predictions
* Mobile optimization (important for your offline vision)

---

## 📦 Dependencies

```id="t1j8tp"
next
react
react-dom
axios
tailwindcss
```

---

## ▶️ Notes

* Ensure backend is running before testing.
* Match API endpoint correctly (`/predict`).
* Handle errors (invalid file, server down).

---

## 📬 Contact

For queries or collaboration, reach out via your project channel.
