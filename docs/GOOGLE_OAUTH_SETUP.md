# Google OAuth 2.0 Setup Guide

## Step 1: Create Google Cloud Project (FREE)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name: `NyayaSahay` (or your preferred name)
4. Click **Create**

## Step 2: Enable OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing) or **Internal** (for organization)
3. Fill in:
   - **App name**: `NyayaSahay` or `LawGPT`
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. Skip **Scopes** (we'll use defaults)
6. Add **Test users** (your Gmail address for testing)
7. Click **Save and Continue**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Fill in:
   - **Name**: `NyayaSahay Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (Vite dev)
     - `http://localhost:3000` (if using other port)
   - **Authorized redirect URIs**:
     - `http://localhost:5173/auth/callback`
5. Click **Create**
6. **Copy** the `Client ID` and `Client Secret`

## Step 4: Configure Your App

Add to your `.env` file:

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
```

## Step 5: Restart Your Server

```bash
# Restart backend
python run.py

# Frontend should auto-reload
```

## Step 6: Test

1. Go to `http://localhost:5173`
2. Click **Sign In**
3. Click **Continue with Google**
4. Sign in with your test Gmail account
5. You should be redirected to `/chat`

---

## Production Setup

For production, update:

1. Add your production domain to **Authorized JavaScript origins**:
   - `https://yourdomain.com`
   
2. Add production redirect URI:
   - `https://yourdomain.com/auth/callback`

3. Update `.env`:
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
```

4. Publish the OAuth app:
   - Go to **OAuth consent screen**
   - Click **Publish App**
   - Complete verification if needed

---

## Troubleshooting

### "redirect_uri_mismatch" Error
- Ensure the redirect URI in Google Console exactly matches your `.env`
- Include protocol (`http://` or `https://`)
- Include port number (`:5173`)

### "access_denied" Error
- Add your Gmail to test users in OAuth consent screen
- Check if app is in testing mode

### "invalid_client" Error
- Double-check Client ID and Secret
- Ensure no extra spaces in `.env`

---

## Security Notes

✅ **PKCE Flow** is implemented - prevents authorization code interception
✅ **State Parameter** used for CSRF protection
✅ **Client Secret** stays on backend only
✅ **JWT Tokens** with 30-minute expiry
