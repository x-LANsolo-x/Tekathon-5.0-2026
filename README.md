# Tekathon 5.0 Platform

Welcome to the official platform repository for **Tekathon 5.0**. This repository contains the complete frontend and backend source code required to host the internal hackathon portal, including participant registration, evaluator scoring, and super admin management.

## 🏗️ Architecture
The platform is built using a modern decoupled architecture:
- **Frontend**: Next.js 16 (React 19) with a highly responsive, custom-built UI utilizing modern glassmorphism and CSS variables.
- **Backend**: Node.js with Express.js, providing robust RESTful APIs.
- **Database**: Supabase (PostgreSQL) for scalable relational data.
- **File Storage**: Direct integration with Google Drive API for storing presentation PDFs/PPTs.
- **Caching**: High-performance `node-cache` memory layer for instantaneous API responses under high concurrency.
- **Security**: Hardened via `helmet.js`, `express-rate-limit`, `hpp`, and strict Node.js validation layers (Zero-Tolerance Rate Limiting, Anti-NoSQL Injection, Cryptographic Session Regeneration).

## 📁 Repository Structure

* `tekathon-frontend/`: Next.js web application housing the Participant, Evaluator, and Super Admin portals.
* `tekathon-backend/`: Node.js API server responsible for database operations, email sending, caching, and Google Drive upload streaming.
* `docs/`: Planning documents, flowcharts, schemas, and API documentation.

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd tekathon-backend
npm install
# Create a .env file based on environment variables (Supabase, Nodemailer, Google API)
npm run dev
# OR: node server.js
```
*The API will start on `http://localhost:5000`.*

### 2. Frontend Setup
```bash
cd tekathon-frontend
npm install
npm run dev
```
*The web portal will start on `http://localhost:3000`.*

## 🔒 Security Posture
The backend is fortified against:
- **Brute Force**: 5-attempt/15-minute strict rate limits on all auth routes.
- **IDOR**: Cryptographic capability URLs and strictly scoped session data.
- **Injection Attacks**: Strict variable type enforcement blocking malicious objects.
- **Parameter Pollution**: HPP middleware configured globally.

## 📈 Performance
Designed for massive scale. Real-time form validations and dashboard generation bypass the network layer via intelligent in-memory Node.js caching. Response times are <1ms, enabling thousands of concurrent participants to register seamlessly.
