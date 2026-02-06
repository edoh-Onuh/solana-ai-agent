# 🚀 Deployment Guide

## Vercel Deployment (5 minutes)

### Prerequisites
- Vercel account (sign up at vercel.com)
- GitHub repository (code pushed)

### Steps

1. **Push to GitHub** (if not already)
```powershell
cd "c:\Users\adanu\OneDrive\edoh-supperteam-platform\solana_validator_pulse\ai-agent-colosseum"
git init
git add .
git commit -m "Initial commit - Colosseum AI Agent"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Deploy to Vercel**
- Go to https://vercel.com/new
- Import your GitHub repository
- Vercel auto-detects Next.js
- Click "Deploy"

3. **Add Environment Variables**
In Vercel dashboard → Settings → Environment Variables:
```
OPENAI_API_KEY=your_openai_api_key_here

SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/demo

NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

4. **Redeploy**
- Click "Redeploy" after adding env vars

5. **Done!**
Your app will be live at: `https://your-project.vercel.app`

---

## Alternative: Vercel CLI (2 minutes)

```powershell
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Add env vars when prompted or via dashboard

# Deploy to production
vercel --prod
```

---

## Post-Deployment Checklist

- [ ] ✅ App loads at Vercel URL
- [ ] ✅ OpenAI API key working (test AI recommendations)
- [ ] ✅ Solana RPC fetching validators (or mock data)
- [ ] ✅ Voting system functional
- [ ] ✅ Charts displaying correctly
- [ ] ✅ No console errors in browser

---

## Troubleshooting

**Issue:** Build fails  
**Fix:** Check that all dependencies are in package.json

**Issue:** API routes fail  
**Fix:** Verify environment variables are set in Vercel dashboard

**Issue:** OpenAI timeout  
**Fix:** Expected - fallback to rule-based recommendations works

**Issue:** Solana RPC timeout  
**Fix:** Expected - gracefully falls back to mock data
