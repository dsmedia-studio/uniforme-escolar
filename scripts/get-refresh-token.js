/**
 * GDF Uniforme Escolar - OAuth Refresh Token Setup
 *
 * This script helps obtain a refresh token for CM360 API access.
 * Run this script locally ONE TIME to get the refresh token,
 * then store it as a GitHub Secret.
 *
 * Usage:
 * 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables
 *    OR edit the values directly in this file
 * 2. Run: node scripts/get-refresh-token.js
 * 3. Follow the URL printed to authorize
 * 4. Paste the authorization code when prompted
 * 5. Copy the refresh_token and add it to GitHub Secrets
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const readline = require('readline');

// Configuration - Replace with your OAuth credentials
// Or set as environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';

// Redirect URI for local server
const REDIRECT_URI = 'http://localhost:3000/callback';

// OAuth scopes required for CM360
const SCOPES = [
  'https://www.googleapis.com/auth/dfareporting',
  'https://www.googleapis.com/auth/dfatrafficking'
];

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/**
 * Get authorization URL
 */
function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
async function getTokens(oauth2Client, code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Method 1: Start local server to receive callback
 */
async function startLocalServer(oauth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = url.parse(req.url, true);

        if (parsedUrl.pathname === '/callback') {
          const code = parsedUrl.query.code;

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                  <h1 style="color: #22c55e;">✅ Authorization Successful!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </body>
              </html>
            `);

            const tokens = await getTokens(oauth2Client, code);
            server.close();
            resolve(tokens);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Error: No authorization code received');
            reject(new Error('No authorization code'));
          }
        } else {
          res.writeHead(404);
          res.end();
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error: ' + error.message);
        reject(error);
      }
    });

    server.listen(3000, () => {
      console.log('Local server started on port 3000');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('Port 3000 is in use. Trying manual method...');
        resolve(null);
      } else {
        reject(err);
      }
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      resolve(null);
    }, 5 * 60 * 1000);
  });
}

/**
 * Method 2: Manual code entry via readline
 */
async function manualCodeEntry(oauth2Client) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve, reject) => {
    rl.question('\nPaste the authorization code here: ', async (code) => {
      rl.close();

      try {
        const tokens = await getTokens(oauth2Client, code.trim());
        resolve(tokens);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('CM360 OAuth Refresh Token Setup');
  console.log('='.repeat(60));
  console.log();

  // Validate credentials
  if (CLIENT_ID === 'YOUR_CLIENT_ID_HERE' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
    console.error('❌ Error: Please set your OAuth credentials.');
    console.log();
    console.log('Options:');
    console.log('1. Set environment variables:');
    console.log('   export GOOGLE_CLIENT_ID="your-client-id"');
    console.log('   export GOOGLE_CLIENT_SECRET="your-client-secret"');
    console.log();
    console.log('2. Or edit this script directly with your credentials.');
    console.log();
    console.log('To get OAuth credentials:');
    console.log('1. Go to https://console.cloud.google.com/apis/credentials');
    console.log('2. Create OAuth 2.0 Client ID (Desktop Application type)');
    console.log('3. Download the JSON credentials');
    process.exit(1);
  }

  const oauth2Client = createOAuth2Client();
  const authUrl = getAuthUrl(oauth2Client);

  console.log('Step 1: Open the following URL in your browser:\n');
  console.log(authUrl);
  console.log();
  console.log('-'.repeat(60));
  console.log();
  console.log('Step 2: Authorize the application and wait for the redirect...');
  console.log();

  let tokens;

  // Try local server method first
  tokens = await startLocalServer(oauth2Client);

  // Fall back to manual entry if server method failed
  if (!tokens) {
    console.log('Using manual code entry method...');
    console.log('After authorizing, you will be redirected to a URL like:');
    console.log('http://localhost:3000/callback?code=XXXXXX');
    console.log();
    console.log('Copy the "code" parameter value from that URL.');

    try {
      tokens = await manualCodeEntry(oauth2Client);
    } catch (error) {
      console.error('❌ Failed to get tokens:', error.message);
      process.exit(1);
    }
  }

  // Display results
  console.log();
  console.log('='.repeat(60));
  console.log('✅ Success! Here are your tokens:');
  console.log('='.repeat(60));
  console.log();

  console.log('Access Token (expires in ~1 hour):');
  console.log(tokens.access_token);
  console.log();

  if (tokens.refresh_token) {
    console.log('Refresh Token (save this as GOOGLE_REFRESH_TOKEN secret):');
    console.log('-'.repeat(60));
    console.log(tokens.refresh_token);
    console.log('-'.repeat(60));
    console.log();
    console.log('⚠️  IMPORTANT: Save this refresh token securely!');
    console.log('   It does not expire and allows access to your CM360 data.');
    console.log();
    console.log('Next steps:');
    console.log('1. Go to your GitHub repository settings');
    console.log('2. Navigate to Secrets and variables > Actions');
    console.log('3. Add the following secrets:');
    console.log('   - GOOGLE_CLIENT_ID: ' + CLIENT_ID.substring(0, 20) + '...');
    console.log('   - GOOGLE_CLIENT_SECRET: [your client secret]');
    console.log('   - GOOGLE_REFRESH_TOKEN: [the refresh token above]');
    console.log('   - CM360_PROFILE_ID: [your CM360 profile ID]');
    console.log('   - CM360_SITE_ID: [optional: specific site ID to filter]');
  } else {
    console.log('⚠️  No refresh token received!');
    console.log('   This may happen if you have already authorized this app.');
    console.log('   To get a new refresh token:');
    console.log('   1. Go to https://myaccount.google.com/permissions');
    console.log('   2. Remove access for this application');
    console.log('   3. Run this script again');
  }
}

// Run
main().catch(console.error);
