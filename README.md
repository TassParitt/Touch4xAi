# Touch4xAi · Smart Touch for Training AI

Touch4xAi is a progressive web metrology application that uses smartphone microphone case contact and 6-axis IMU kinematic sensors to measure surface properties (texture, hardness, density) via Fourier acoustic spectrum analysis, relative skin calibration baseline (-100% to +100%), and direct edge dataset streaming to Cloudflare R2 for Large Tactile Model (LTM) training.

---

## Key Features

1. **Smart Touch AI Training Data Collection**:
   - **Texture**: 3 swipes back-and-forth across the surface counted via accelerometer.
   - **Hardness**: 3 taps on the microphone port against the surface counted via accelerometer.
   - **Density**: 6 seconds continuous motor vibration resonance measurement.

2. **Relative Skin Metrology Baseline**:
   - 0% anchor reference comparison against human forearm skin baseline.
   - Relative differential percentage scale (-100% to +100%) for intuitive comparison.
   - Preserves Ashby physical benchmarks (1.0 to 10.0) alongside relative metrics for tactile model ingestion.

3. **Cloudflare R2 Direct Edge Storage (`touch4xai` Bucket)**:
   - **Target Bucket**: `touch4xai` (Account: `2752109d4d388476f42f329b6f68c629`)
   - **Target Directory**: `raw_datasets/`
   - **Architecture**: 3-Tier token-safe pipeline:
     1. PWA requests temporary Presigned PUT upload URL (valid for 5 minutes).
     2. Cloudflare Worker or backend proxy issues presigned upload ticket.
     3. Browser client directly streams high-resolution micro-acoustic audio signals and 6-axis IMU JSON datasets into Cloudflare R2.

4. **Multi-Format Metrology Export**:
   - Direct JSON dataset export for Large Tactile Models (LTMs).
   - Publication-grade PDF characterization reports with embedded 24-bit visualizer snapshots.
   - RFC-4180 consolidated CSV datasets for Python Pandas, R, and MATLAB.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (.env)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Add your optional credentials:
```env
PORT=3000
NODE_ENV=development

# Cloudflare R2 Metrology Storage (Bucket: touch4xai)
R2_ACCOUNT_ID=2752109d4d388476f42f329b6f68c629
R2_BUCKET_NAME=touch4xai
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
CLOUDFLARE_WORKER_URL=
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## Cloudflare R2 Bucket & Worker Setup

### Step A: Set CORS Policy on `touch4xai` Bucket
In the Cloudflare Dashboard under **R2** &rarr; `touch4xai` &rarr; **Settings** &rarr; **CORS Policy**, paste:
```json
[
  {
    "AllowedOrigins": [
      "https://touchxai.pages.dev",
      "http://localhost:3000",
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "GET"
    ],
    "AllowedHeaders": [
      "Content-Type"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Step B: Deploy the Cloudflare Worker
The worker source code is located in `/cloudflare-worker/`:
```bash
cd cloudflare-worker
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler deploy
```

---

## GitHub Repository Sync

This codebase is configured to sync directly with GitHub repository `TassParitt/TouchXAi`:
```bash
git init
git remote add origin https://github.com/TassParitt/TouchXAi.git
git add .
git commit -m "feat: Touch4xAi Smart Touch AI training with 3-tier Cloudflare R2 dataset stream"
git branch -M main
git push -u origin main
```
