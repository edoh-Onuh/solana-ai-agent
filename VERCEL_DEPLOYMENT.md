# Vercel Deployment Guide

## Environment Variables Setup

To make the Vercel deployment work exactly like your local environment, you need to configure the following environment variables in your Vercel dashboard:

### Required Environment Variables

1. **NEXT_PUBLIC_SOLANA_RPC_URL**
   - Value: `https://johna-k3cr1v-fast-mainnet.helius-rpc.com`
   - Description: High-performance Helius RPC endpoint for Solana mainnet
   - Required for: Fetching validator data, vote accounts, and stake information

2. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Description: Database for storing validator votes
   - Required for: Voting features (approve/reject recommendations)
   - Get from: Your Supabase project settings → API → Project URL
   - Note: App will work without this but voting will be disabled

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anonymous key
   - Description: Public API key for Supabase authentication
   - Required for: Voting features
   - Get from: Your Supabase project settings → API → Project API keys → anon/public
   - Note: App will work without this but voting will be disabled

4. **OPENAI_API_KEY** (Optional - for AI recommendations)
   - Value: Your OpenAI API key
   - Description: Required for GPT-4o AI validator recommendations
   - Get from: https://platform.openai.com/api-keys
   - Note: Without this, AI recommendations may use fallback logic

## How to Add Environment Variables to Vercel

### Method 1: Vercel Dashboard (Recommended)
1. Go to your project on Vercel: https://vercel.com/dashboard
2. Click on your project name
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Name: `NEXT_PUBLIC_SOLANA_RPC_URL`
   - Value: `https://johna-k3cr1v-fast-mainnet.helius-rpc.com`
   - Environments: Check all (Production, Preview, Development)
5. Click **Save**
6. Redeploy your project

### Method 2: Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
# Enter: https://johna-k3cr1v-fast-mainnet.helius-rpc.com

# Redeploy
vercel --prod
```

## Troubleshooting

### Issue: Voting features not working
**Solution**: Add Supabase environment variables in Vercel:
1. Go to Vercel → Settings → Environment Variables
2. Add `NEXT_PUBLIC_SUPABASE_URL` with your Supabase project URL
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your Supabase anon key
4. Redeploy the application
5. If you don't have Supabase, the app will still work but voting will be disabled
**Solution**: Ensure `NEXT_PUBLIC_SOLANA_RPC_URL` is set in Vercel. This is required for the app to fetch validator vote accounts.

### Issue: API routes returning errors
**Solution**: 
1. Check Vercel function logs: Project → Deployments → Click latest → Functions tab
2. Verify RPC endpoints are accessible from Vercel's edge network
3. Ensure no rate limits are hit on RPC providers

### Issue: Data loads slowly or times out
**Solution**:
1. Helius RPC should be the primary endpoint (already configured)
2. Check Vercel function timeout (default 10s for hobby, 60s for pro)
3. Consider upgrading to Vercel Pro for longer function timeouts

### Issue: Environment variables not taking effect
**Solution**:
1. After adding environment variables, you MUST redeploy
2. Go to Deployments → Click "..." on latest deployment → Redeploy
3. Or push a new commit to trigger automatic deployment

## Redeploy After Configuration

After adding environment variables, redeploy your application:

### Option 1: Git Push (Automatic)
```bash
git add .
git commit -m "Configure Vercel environment variables"
git push origin main
```

### Option 2: Manual Redeploy
1. Go to Vercel dashboard
2. Deployments tab
3. Click "..." menu on latest deployment
4. Click "Redeploy"

## Verification

After deployment, verify everything works:

1. **Check Superteam Validators**
   - Open your Vercel app URL
   - Should see "6 Superteam validators" in the stats
   - Filter "Show Superteam Only" should display all 6 validators

2. **Check Console Logs**
   - Open browser DevTools (F12)
   - Console tab should show:
     - "SolanaClient initialized with RPC: Helius (fast)"
     - "Superteam validators found: 6"
     - No RPC errors

3. **Check API Response**
   - Open: `https://your-app.vercel.app/api/validators`
   - Should return JSON with all validators
   - Check response time (should be <2 seconds)

## Production Optimization

The following optimizations are already configured:

✅ **Helius RPC** - High-performance RPC endpoint
✅ **Multiple RPC Fallbacks** - Automatic failover if primary fails
✅ **Vote Account Detection** - Uses votePubkey for accurate Superteam matching
✅ **Stake Account Utilities** - Accurate stake querying available
✅ **Session Storage Caching** - Reduces API calls, improves performance
✅ **Confirmed Commitment** - Faster responses with maintained accuracy

## Support

If issues persist after configuration:
1. Check Vercel function logs for errors
2. Verify all environment variables are set correctly
3. Ensure Helius RPC endpoint is accessible
4. Check browser console for JavaScript errors

## Quick Fix Command

To quickly redeploy with environment variables:

```bash
cd frontend
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
# Paste: https://johna-k3cr1v-fast-mainnet.helius-rpc.com
vercel --prod
```

This will immediately deploy with the correct configuration.
