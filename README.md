# Excel Messaging Assistant (مساعد مراسلات إكسل)

A client-side, privacy-preserving productivity application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **IndexedDB**.

Import contact spreadsheets (XLSX, XLS, CSV), compose personalized message templates, review and preview messages safely, open official WhatsApp Click-to-Chat conversations, track user-confirmed manual sending sessions, and export audit reports with privacy protection.

---

## 🌟 Key Features

1. **Spreadsheet & CSV Import Engine**
   - Supports `.xlsx`, `.xls`, and `.csv` files via drag-and-drop or file picker.
   - Worksheet selection for multi-sheet workbooks.
   - Safe parsing: never evaluates arbitrary macros or formulas from uploaded files.
   - Dynamic column mapping for Name, Phone, Company, Email, and Custom variables.

2. **Phone Number Normalization & Validation**
   - Built on `libphonenumber-js`.
   - Normalizes local formats (Egypt by default, with country selector for Saudi Arabia, UAE, USA, UK, Germany, etc.).
   - Correctly cleans Excel artifacts (scientific notation, `.0` suffixes).
   - Identifies duplicate numbers and invalid entries without silently discarding data.

3. **Message Composer & Template Engine**
   - Real-time preview with WhatsApp-style chat bubbles.
   - Dynamic placeholders: `{{name}}`, `{{phone}}`, `{{company}}`, `{{email}}`, and any custom imported variables.
   - Character count and full Arabic Unicode & Emoji support.
   - Safety checks: highlights unresolved or missing variables to prevent broken messages.

4. **Messaging Platform Integration**
   - Implements official WhatsApp Click to Chat URL standard (`https://wa.me/<number>?text=<encoded_text>`).
   - Modular `MessagingAdapter` interface ready for future providers.
   - Fallback and direct copy link when browser popup blockers intervene.

5. **Queue & Interactive Session Workflow**
   - Clear distinction between **"Opened"** and **"User Confirmed Sent"**.
   - Session status persistence in IndexedDB across page reloads.
   - Step-by-step queue controls: Open Chat, Confirm Sent, Skip Contact, Navigate, and Reset.
   - Mock Mode setting for automated testing or dry-runs without opening real browser tabs.

6. **Privacy & Security by Design**
   - 100% Client-Side: zero servers, zero external data uploads, zero paid APIs required.
   - Export reports in CSV and XLSX with formula injection protection (`'`, `=`, `+`, `-`, `@`) and UTF-8 BOM for Arabic compatibility.
   - Configurable phone number masking (`+2010******78`) in exported reports.

7. **Bilingual Arabic & English UI**
   - Full RTL (Right-to-Left) Arabic support.
   - Full LTR English support.
   - Light & Dark theme toggle.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone or navigate to the directory
cd quirky-bardeen

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

### Run Unit and Integration Tests (Vitest)
```bash
npm test
```
The test suite covers:
- Phone number normalization, Excel artifact cleaning, and privacy masking.
- Template variable replacement, emoji preservation, and WhatsApp link generation.
- Spreadsheet row mapping and duplicate detection.
- CSV escaping and spreadsheet formula injection defense.
- App integration workflows, navigation, and bilingual RTL/LTR switching.

### Production Build
```bash
npm run build
npm run preview
```

---

## 📁 Sample Test Data

A fictional test file `sample_contacts.csv` is provided in the repository root for testing:
- Valid local and international numbers.
- Intentional duplicate numbers.
- Intentional invalid numbers.
- Arabic names and organization details.

---

## ⚠️ Important Operating Distinctions & Platform Limitations

- **Conversation Opening vs. Delivery**: In WhatsApp Click to Chat, opening the conversation is not proof of delivery. The user must review and send the message manually within WhatsApp and then confirm the action in the application to record an audit trail.
- **Bulk Automation**: The free MVP does not automate sending or bypass WhatsApp platform security. It streamlines manual one-by-one execution safely and comfortably.
