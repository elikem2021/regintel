# RegIntel — Regulatory Intelligence Dashboard

FDA recall intelligence with Hunter.io contact enrichment for DigiComply prospecting.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and add your Hunter API key
3. `npm run dev`

## Vercel Deployment
Add `HUNTER_API_KEY` as an environment variable in Vercel project settings.

## Features
- Live FDA recall feed (Class I, II, III)  
- Click any company → instant decision maker contacts via Hunter
- Domain override for manual correction
- Export contacts to CSV for Instantly sequences
