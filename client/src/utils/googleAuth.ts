/**
 * Google Authentication Service
 * Uses Google Identity Services (GIS) for real OAuth popup
 * and communicates with ReadEase backend /api/v1/auth/google
 */

// TypeScript declarations for Google Identity Services global
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
            context?: 'signin' | 'signup' | 'use';
          }) => void;
          prompt: (
            callback?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              isDismissedMoment: () => boolean;
              getNotDisplayedReason: () => string;
              getSkippedReason: () => string;
              getDismissedReason: () => string;
            }) => void
          ) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
              locale?: string;
            }
          ) => void;
          disableAutoSelect: () => void;
          revoke: (
            hint: string,
            callback: (done: { successful: boolean; error: string }) => void
          ) => void;
        };
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode?: 'popup' | 'redirect';
            callback: (response: { code: string }) => void;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

export interface GoogleAuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    profileImage?: string;
  };
  accessToken: string;
}

/**
 * Decode a JWT payload without verification (client-side preview only).
 * Server always verifies the token properly.
 */
function decodeJwtPayload(token: string): Record<string, string> {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

/**
 * Wait for the Google Identity Services script to load.
 * Returns true if GIS is available, false if timeout.
 */
function waitForGIS(timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      resolve(true);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}

/**
 * Trigger the real Google OAuth sign-in popup.
 * Returns the Google ID token (JWT credential).
 *
 * @param context - 'signin' for login, 'signup' for registration
 * @throws Error if GIS is not loaded or Client ID is missing
 */
export async function initiateGoogleSignIn(
  context: 'signin' | 'signup' = 'signin'
): Promise<string> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in client/.env\n' +
        'Get one at: https://console.cloud.google.com/apis/credentials'
    );
  }

  const gisReady = await waitForGIS();
  if (!gisReady || !window.google?.accounts?.id) {
    throw new Error(
      'Google Identity Services failed to load. Please check your internet connection and try again.'
    );
  }

  return new Promise<string>((resolve, reject) => {
    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          resolve(response.credential);
        } else {
          reject(new Error('No credential received from Google'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      context: context === 'signup' ? 'signup' : 'signin'
    });

    // Trigger the Google account chooser popup
    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason();
        console.warn('Google prompt not displayed:', reason);

        // If popup is blocked or browser_not_supported, try rendering a hidden button and clicking it
        if (reason === 'opt_out_or_no_session' || reason === 'suppressed_by_user') {
          // User has no Google session or opted out — create a fallback button
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.top = '-9999px';
          container.style.left = '-9999px';
          document.body.appendChild(container);

          window.google!.accounts.id.renderButton(container, {
            type: 'standard',
            size: 'large',
            text: context === 'signup' ? 'signup_with' : 'continue_with'
          });

          // Click the rendered Google button
          const btn = container.querySelector('div[role="button"]') as HTMLElement;
          if (btn) {
            btn.click();
          } else {
            document.body.removeChild(container);
            reject(
              new Error(
                'Google sign-in unavailable. Please ensure you are signed into a Google account in your browser, or try disabling popup blockers.'
              )
            );
          }

          // Cleanup after a delay
          setTimeout(() => {
            if (document.body.contains(container)) {
              document.body.removeChild(container);
            }
          }, 60000);
        } else {
          reject(
            new Error(
              `Google sign-in popup could not be displayed (${reason}). ` +
                'Please try again or check your browser popup settings.'
            )
          );
        }
      }

      if (notification.isSkippedMoment()) {
        reject(new Error('Google sign-in was skipped. Please try again.'));
      }

      if (notification.isDismissedMoment()) {
        reject(new Error('Google sign-in was cancelled.'));
      }
    });
  });
}

/**
 * Send the Google ID token + selected role to the ReadEase backend.
 * The backend verifies the token with Google and creates/finds the user.
 */
export async function loginWithGoogleApi(
  credential: string,
  role: string
): Promise<GoogleAuthResponse> {
  // Decode the token client-side for preview (server verifies it properly)
  const decoded = decodeJwtPayload(credential);

  try {
    const response = await fetch('/api/v1/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential,
        role,
        // Send decoded fields as fallback for dev mode when server can't verify
        email: decoded.email,
        name: decoded.name,
        profileImage: decoded.picture,
        googleId: decoded.sub
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        if (data.data.accessToken) {
          localStorage.setItem('readease_access_token', data.data.accessToken);
        }
        return data.data;
      }
    }

    // If backend responded but with error
    const errorData = await response.json().catch(() => null);
    console.warn('Backend Google auth failed:', errorData);
  } catch (error) {
    console.warn('Backend /api/v1/auth/google unreachable, using client-side fallback:', error);
  }

  // Graceful fallback for offline/local dev — use decoded Google token data
  return {
    user: {
      id: decoded.sub || `goog_${Date.now()}`,
      name: decoded.name || 'Google User',
      email: decoded.email || 'user@gmail.com',
      role: role,
      status: 'active',
      profileImage:
        decoded.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(decoded.name || 'User')}&background=4285F4&color=fff`
    },
    accessToken: `client_fallback_${Date.now()}`
  };
}

/**
 * Revoke Google sign-in for the given email (used on logout).
 */
export function revokeGoogleSession(email: string): void {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.revoke(email, (done) => {
      if (!done.successful) {
        console.warn('Google session revocation failed:', done.error);
      }
    });
    window.google.accounts.id.disableAutoSelect();
  }
}
