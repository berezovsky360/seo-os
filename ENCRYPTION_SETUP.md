# 🔐 Encryption Setup Guide

WordPress credentials (Application Passwords) are encrypted using **AES-256-GCM** before being stored in the database.

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Client)                                       │
│  ├── User enters credentials in Settings form          │
│  └── Sends to API route via HTTPS                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  API Route (Server)                                     │
│  ├── Receives credentials                               │
│  ├── Encrypts password with AES-256-GCM                 │
│  └── Stores encrypted password in Supabase             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Database                                      │
│  ├── wp_username: "admin" (plaintext)                   │
│  └── wp_app_password: "iv:encrypted" (encrypted)        │
└─────────────────────────────────────────────────────────┘
```

## Security Features

✅ **AES-256-GCM Encryption** - Industry standard, authenticated encryption
✅ **Server-side Only** - Encryption/decryption never happens in browser
✅ **Unique IV per encryption** - Each password has unique initialization vector
✅ **HTTPS Transport** - All data transmitted over secure connection
✅ **RLS Policies** - Supabase Row Level Security restricts access

## Setup Instructions

### 1. Generate Encryption Key

Run the key generation script:

```bash
npx tsx scripts/generate-encryption-key.ts
```

This will output:

```
🔐 Generating AES-256-GCM encryption key...

✅ Encryption key generated successfully!

📋 Add this to your .env.local file:

ENCRYPTION_KEY=abc123xyz789...

⚠️  IMPORTANT: Keep this key secure and never commit it to git!
```

### 2. Add to Environment Variables

**Local Development** (`.env.local`):
```bash
ENCRYPTION_KEY=your-generated-key-here
```

**Production** (Vercel/Netlify):
1. Go to project settings
2. Add environment variable: `ENCRYPTION_KEY`
3. Paste generated key as value
4. Deploy

### 3. Verify Setup

1. Add a WordPress site in the dashboard
2. Go to site Settings
3. Enter WordPress credentials:
   - URL: `https://yoursite.com`
   - Username: `admin`
   - Application Password: `xxxx xxxx xxxx xxxx`
4. Click "Save & Connect"
5. Check database - password should be encrypted: `iv:encrypted_data`

## API Routes

### POST /api/sites/[siteId]/credentials
Save WordPress credentials (encrypts password)

**Request:**
```json
{
  "wp_username": "admin",
  "wp_app_password": "xxxx xxxx xxxx xxxx"
}
```

**Response:**
```json
{
  "success": true,
  "site": {
    "id": "uuid",
    "wp_username": "admin",
    "wp_app_password": "***"
  }
}
```

### POST /api/sites/[siteId]/test-connection
Test WordPress connection (decrypts password on server)

**Response:**
```json
{
  "success": true,
  "message": "Connected as John Doe (john@example.com)"
}
```

### POST /api/sites/[siteId]/sync
Sync posts from WordPress (decrypts password on server)

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced from WordPress",
  "postsSynced": 47
}
```

## Database Schema

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY,
  wp_username TEXT,                    -- Plaintext username
  wp_app_password TEXT,                -- Encrypted: "iv:encrypted_data"
  ...
);
```

## Security Best Practices

### ✅ DO:
- Store `ENCRYPTION_KEY` in environment variables only
- Use different keys for development and production
- Rotate encryption key periodically (requires re-encrypting all passwords)
- Use HTTPS in production (Vercel/Netlify provide this automatically)
- Restrict Supabase Service Role Key to server-side only

### ❌ DON'T:
- Commit `ENCRYPTION_KEY` to git
- Share encryption key via email/Slack
- Use the same key across multiple projects
- Store decrypted passwords in browser localStorage/sessionStorage
- Expose Service Role Key in client-side code

## Troubleshooting

### Error: "ENCRYPTION_KEY not found in environment variables"

**Solution:** Add `ENCRYPTION_KEY` to `.env.local` using the generated key.

### Error: "Invalid encrypted data format"

**Cause:** Password in database is not properly encrypted (may be plaintext from before encryption was enabled).

**Solution:** Delete the site and re-add with new credentials.

### How to rotate encryption key?

1. Generate new encryption key
2. Create migration script to:
   - Read all sites with credentials
   - Decrypt with old key
   - Re-encrypt with new key
   - Update database
3. Update `ENCRYPTION_KEY` in environment
4. Deploy

## Code Reference

**Encryption Utility:** `lib/utils/encryption.ts`
**API Routes:** `app/api/sites/[siteId]/credentials/route.ts`
**Frontend:** `components/SiteDetails.tsx`

## Need Help?

Check the main README or create an issue on GitHub.
