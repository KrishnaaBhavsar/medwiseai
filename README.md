# MedWise AI 🏥

MedWise AI is a production-ready, AI-powered healthcare assistant designed to improve health literacy and promote sustainable medicine management. It helps users understand medical documents, manage their medicine cabinet responsibly, and make informed healthcare decisions.

## ✨ Key Features

### 📄 Prescription & Lab Report Analyzer
Transform complex medical documents into clear, actionable insights.
- **AI-Powered Explanations**: Converts medical jargon into simple language using Google Gemini.
- **Visual Evidence**: Support for uploading images and PDFs of prescriptions and lab reports.

### 🔍 Medicine Strip Scanner (OCR)
Fast and accurate medicine identification.
- **Smart Extraction**: Scans medicine strips to automatically extract names, expiry dates, and dosage info.
- **Manual Verification**: Integrated review flow to ensure 100% accuracy before logging.

### ♻️ Responsible Medicine Management
- **Donate or Dispose Flow**: A dedicated safety logic system that assesses if medicine is fit for donation or requires safe disposal.
- **Facility Finder**: Interactive mapping (via OpenStreetMap) to locate nearby hospitals, pharmacies, and clinics for donation or disposal.
- **Safety Guidelines**: Step-by-step instructions for the safe disposal of hazardous or expired medications.

### 💊 OTC Suggestions & Search
- **Ailment Guidance**: AI-driven recommendations for common issues like headaches, allergies, and fever.
- **Medicine Encyclopedia**: Detailed AI-generated descriptions for thousands of medicines including usage, safety, and side effects.

### 🤖 Health Assistant Chatbot
- **Persistent Support**: A global AI chatbot available across the platform for instant medical queries.
- **Contextual Actions**: Quick shortcuts for prescription analysis, disposal info, and more.

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI.
- **Backend**: Express.js, Node.js.
- **AI**: Google Gemini API for natural language processing and image analysis.
- **Maps**: OpenStreetMap (Overpass API) with Leaflet.
- **State Management**: TanStack Query (React Query).

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in a `.env` file (see `.env.example`):
   ```env
   GEMINI_API_KEY=your_key_here
   ```

### Development

Run the development server (client and server):
```bash
npm run dev
```

### Build

Create a production build:
```bash
npm run build
```

## 🔒 Safety & Privacy
MedWise AI is designed with health literacy in mind. While it provides AI-powered insights, it is intended to supplement—not replace—professional medical advice. Always consult with a healthcare professional before making medical decisions.
