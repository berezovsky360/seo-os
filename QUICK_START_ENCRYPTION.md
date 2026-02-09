# 🚀 Quick Start: Enable Encryption

## Step 1: Install Dependencies

```bash
npm install tsx --save-dev
```

## Step 2: Generate Encryption Key

```bash
npx tsx scripts/generate-encryption-key.ts
```

Copy the output key.

## Step 3: Update .env.local

Add these variables to your `.env.local` file:

```bash
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-key

# New required variables
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase
ENCRYPTION_KEY=your-generated-key-from-step-2
```

**Where to find Service Role Key:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy "service_role" secret key (⚠️ Never commit this!)

## Step 4: Test It

1. Start dev server: `npm run dev`
2. Add a WordPress site
3. Go to Settings tab
4. Enter WordPress credentials
5. Click "Save & Connect"
6. Click "Test Connection"

✅ If you see "Connected as [name]" - encryption is working!

## Verification

Check your Supabase database:
- Go to Table Editor → sites
- Look at `wp_app_password` column
- Should see encrypted format: `abc123:xyz789...`
- Should NOT see plaintext password

## Production Deployment

### Vercel:
1. Go to Project Settings → Environment Variables
2. Add:
   - `ENCRYPTION_KEY` → [your generated key]
   - `SUPABASE_SERVICE_ROLE_KEY` → [from Supabase]
3. Redeploy

### Other platforms:
Add the same environment variables to your hosting provider.

---

For detailed docs, see [ENCRYPTION_SETUP.md](./ENCRYPTION_SETUP.md)
