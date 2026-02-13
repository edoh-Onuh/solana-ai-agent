# Enable Voting on Vercel - Quick Setup

Your voting feature works locally! To make it work on Vercel, follow these steps:

## Step 1: Get Your Local Environment Variables

Check your local `.env.local` file for these values:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

Or run this command to see your local config:
```bash
cd frontend
cat .env.local
```

## Step 2: Add to Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (copy the exact values from your local `.env.local`):

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (paste from your .env.local)
   - Environments: ✓ Production ✓ Preview ✓ Development

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: (paste from your .env.local)
   - Environments: ✓ Production ✓ Preview ✓ Development

   **Variable 3 (Already set, but verify):**
   - Name: `NEXT_PUBLIC_SOLANA_RPC_URL`
   - Value: `https://johna-k3cr1v-fast-mainnet.helius-rpc.com`
   - Environments: ✓ Production ✓ Preview ✓ Development

5. Click **Save** for each variable

## Step 3: Redeploy

After adding all variables:
1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (~2-3 minutes)

## Step 4: Verify

1. Open your Vercel app URL
2. Connect wallet
3. Generate AI recommendation
4. Try voting (Approve/Reject)
5. Should see success message and vote count update

## Troubleshooting

If voting still fails after deployment:
1. Check Vercel deployment logs for errors
2. Open browser console (F12) and check for error messages
3. Verify environment variables are set correctly in Vercel
4. Make sure you redeployed AFTER adding the variables

## Quick Test

Open browser console on Vercel app and run:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```
Should show your Supabase URL (not undefined)

---

**Note**: The code is already pushed to GitHub with all fixes. You only need to configure environment variables in Vercel.
