# Deployment Guide (No Server-Side `npm run`)

Since your hosting provider does not support running `npm run` commands directly on the server, you can deploy the Healthcare Intelligence Platform (HIP) by **building the project locally** on your machine and uploading the pre-built files.

Here is the exact step-by-step process for deploying the Frontend and Backend.

---

## 🌐 1. Frontend Deployment (Static Hosting)

The frontend is a React application built with Vite. It compiles into static HTML, JavaScript, and CSS files. The hosting server **does not need** Node.js or `npm` to serve it. It can run on Apache, Nginx, cPanel `public_html`, Netlify, Vercel, or any simple static web server.

### Steps:
1. **Build locally**: On your local computer, open a terminal in the `frontend` folder and run:
   ```bash
   npm install
   npm run build
   ```
2. **Locate files**: This will generate a folder named `dist` inside the `frontend/` directory.
3. **Upload**: Upload **only the contents of this `dist` folder** (containing `index.html`, `assets/`, etc.) to your hosting's public directory (e.g., `public_html` or `/var/www/html`).

---

## ⚙️ 2. Backend Deployment (Node.js Hosting)

The backend is written in TypeScript and must be compiled to JavaScript before running.

### Option A: Local Build & Upload (Recommended)
You compile the code locally, upload the JavaScript files, and run them with plain `node`.

1. **Build locally**: On your local computer, open a terminal in the `backend` folder and compile the TypeScript code:
   ```bash
   npm install
   npm run build
   ```
   *(This runs the `tsc` compiler and generates a `dist/` folder inside `backend/` containing plain JavaScript files like `dist/server.js`)*.

2. **Upload**: Upload the following files and folders from the `backend/` directory to your server:
   - `dist/` (contains compiled server code)
   - `node_modules/` (contains runtime dependencies)
   - `package.json`
   - `.env` (your environment configuration variables)

3. **Start the server on hosting**: Run the app using plain Node directly:
   ```bash
   node dist/server.js
   ```

---

### Option B: Hosting Console (Direct Node Execution)
If you can install dependencies on the hosting platform but cannot run custom scripts:

1. **Install dependencies on server**:
   ```bash
   npm install --production
   ```
2. **Compile TypeScript using npx**:
   ```bash
   npx tsc
   ```
3. **Start directly**:
   ```bash
   node dist/server.js
   ```

---

### Option C: cPanel Node.js Selector / PM2 / Passenger
If your hosting uses a web interface like cPanel Node.js selector or PM2 process manager:

- **Application Startup File**: Set this to `dist/server.js`.
- **Application Entry Point**: Set this to `dist/server.js`.
- **Environment Variables**: Add your `.env` key-values (like `PORT`, `DATABASE_URL`, `JWT_SECRET`) in the hosting panel's interface.
