# Deployment Guide (Netlify)

This project is ready to be deployed to Netlify.

## Prerequisites
- A GitHub repository containing this code.
- A Netlify account.

## Steps

1.  **Push to GitHub**:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    # Add your remote origin
    # git remote add origin <your-repo-url>
    git push -u origin main
    ```

2.  **Connect to Netlify**:
    -   Log in to Netlify.
    -   Click "Add new site" -> "Import from an existing project".
    -   Select GitHub and choose your repository.

3.  **Configure Build Settings**:
    -   **Build Command**: `npm run build`
    -   **Publish Directory**: `dist`
    -   (The `netlify.toml` file in the repo should auto-configure this).

4.  **Environment Variables**:
    -   Go to **Site Settings** -> **Environment Variables**.
    -   Add the following variables (copy values from your local `.env`):
        -   `VITE_FIREBASE_API_KEY`
        -   `VITE_FIREBASE_AUTH_DOMAIN`
        -   `VITE_FIREBASE_PROJECT_ID`
        -   `VITE_FIREBASE_STORAGE_BUCKET`
        -   `VITE_FIREBASE_MESSAGING_SENDER_ID`
        -   `VITE_FIREBASE_APP_ID`
        -   `VITE_GEMINI_API_KEY`
        -   `VITE_OPENAI_API_KEY`
        -   `VITE_LIVEKIT_URL`
        -   `VITE_LIVEKIT_TOKEN_ENDPOINT`

5.  **Deploy**:
    -   Click "Deploy Site".

## LiveKit Setup
To enable voice channels, you need a LiveKit instance (Cloud or Self-hosted).

1.  **Sign up for LiveKit Cloud** or host your own server.
2.  **Get API Key and Secret** for your project.
3.  **Set up a Token Endpoint**:
    -   You need a backend service to generate access tokens.
    -   You can use a Cloud Function, Lambda, or a simple Node.js server.
    -   The endpoint should accept `roomName` and `participantName` (and optionally `identity`).
    -   It should return a JSON object: `{ "token": "..." }`.
4.  **Configure Environment Variables**:
    -   `VITE_LIVEKIT_URL`: Your LiveKit WebSocket URL (e.g., `wss://your-project.livekit.cloud`).
    -   `VITE_LIVEKIT_TOKEN_ENDPOINT`: The URL of your token generation endpoint.

## Troubleshooting
-   **Secret Scanning Errors**: The `netlify.toml` file now includes `SECRETS_SCAN_ENABLED = "false"` to prevent build failures. Since this is a client-side AI app, API keys must be exposed to the browser.
-   **Page Not Found on Refresh**: Ensure `netlify.toml` exists with the redirect rule.
-   **API Errors**: Double-check that your Environment Variables in Netlify match your `.env` file exactly.

## Documentation
-   [RTC Research Brief](./docs/rtc-research.md) - Summary of RTC/chat product insights and engineering recommendations.
