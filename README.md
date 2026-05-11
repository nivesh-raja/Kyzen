# Kyzen – Secure Identity Verification  
AI-Powered KYC Automation System

# Run and deploy your AI Studio app
kyzen-seven.vercel.app
This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1RLxZd_gDCG3wgdU5ykQSspGVxaijdX3W

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# Kyzen – Secure Identity Verification  
AI-Powered KYC Automation System

Kyzen is a modern, AI-driven Know Your Customer (KYC) verification platform designed to automate identity validation using document analysis, extraction, and intelligent match scoring.  
This system provides a clean and intuitive user experience along with a strong verification workflow suitable for fintech, banking, and enterprise onboarding.

---

## 🚀 Features

### 🔐 **User Authentication**
- Modern Sign-In page  
- Email + Password login  
- Quick Demo Access (Admin / Analyst)

### 🧾 **KYC Application Workflow**
- Multi-step application: Details → Documents → Selfie → Result  
- Supports Aadhaar, PAN, Passport, Driving License, etc.  
- Clean UI with floating labels & responsive design

### 🤖 **AI Document Verification**
- Extracts key fields (Name, DOB, ID number, Address)  
- Validates document clarity and tampering  
- Compares extracted fields with user-entered details  
- Generates a smart *Match Score*  
- Produces final decision: **Verified**, **Pending**, or **Rejected**

### 📊 **Dashboard & Analytics**
- Total applications  
- Verified cases  
- Pending reviews  
- Average match score  
- Activity charts + Latest verifications

### 📁 **Verification History**
- View all past verifications  
- Search / Filter  
- Status & score preview

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Tailwind CSS |
| AI Engine | Google Gemini API |
| State Management | React Hooks |
| UI Theme | Custom Fintech Glass UI |
| Deployment Ready | Vite / React |

---

## 📂 Project Structure (Simplified)
Kyzen/
│
├── src/
│ ├── components/
│ ├── views/
│ ├── hooks/
│ ├── assets/
│ └── App.tsx
│
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── README.md
🧠 AI Verification Flow

User enters personal details

Uploads document images

Gemini AI extracts text + information

System compares extracted data with the input

Generates match score

Displays final verification status

Saves data to verification history

This ensures faster, more accurate onboarding compared to manual KYC methods.

🎨 UI/UX Highlights

Soft fintech gradient theme

Glass-morphism cards

Smooth transitions

Clean typography using Inter

Mobile-friendly layout

🛡️ Security Notes

No sensitive data stored locally

API key protected through .env

Safe AI parsing & validation

📜 License

This project is for educational and demonstration purposes.
Feel free to modify and rebuild for your own use.
