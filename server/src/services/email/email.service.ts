import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let cachedLogoDataUri = '';

/**
 * Loads and caches the ReadEase wordmark logo as an inline data URI
 * for rich cross-client email rendering.
 */
function getEmailLogoSrc(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const candidatePaths = [
      path.resolve(__dirname, '../../../../server/assets/ReadEase_wordmark_transparent.svg'),
      path.resolve(__dirname, '../../../assets/ReadEase_wordmark_transparent.svg'),
      path.resolve(process.cwd(), 'assets/ReadEase_wordmark_transparent.svg'),
      path.resolve(process.cwd(), 'server/assets/ReadEase_wordmark_transparent.svg'),
      path.resolve(process.cwd(), 'ReadEase_wordmark_transparent.svg'),
      path.resolve(process.cwd(), '../ReadEase_wordmark_transparent.svg')
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        // Extract embedded lossless transparent PNG data URI if present
        const pngMatch = content.match(/href="([^"]+)"/);
        if (pngMatch && pngMatch[1]) {
          cachedLogoDataUri = pngMatch[1];
          return cachedLogoDataUri;
        }
        const b64 = Buffer.from(content).toString('base64');
        cachedLogoDataUri = `data:image/svg+xml;base64,${b64}`;
        return cachedLogoDataUri;
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Could not load ReadEase_wordmark_transparent.svg for email');
  }
  return '';
}

export interface SendOtpEmailOptions {
  to: string;
  name?: string;
  otp: string;
  purpose: 'signup' | 'forgot_password';
}

export interface SendVerificationEmailOptions {
  to: string;
  name?: string;
  verificationUrl: string;
}

export interface EmailDeliveryResult {
  sent: boolean;
  devMode: boolean;
  provider: 'resend' | 'smtp' | 'simulation';
  id?: string;
}

export class EmailService {
  private static smtpTransporter: Transporter | null = null;

  /**
   * Primary dispatcher: Sends email via Resend REST API if RESEND_API_KEY is configured.
   * Otherwise falls back to SMTP, and finally to local dev console simulation.
   */
  private static async deliverEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    purpose?: string;
  }): Promise<EmailDeliveryResult> {
    const { to, subject, html, text, purpose = 'notification' } = options;

    // 1. Primary: Resend REST API
    if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim()) {
      try {
        const fromAddress = env.RESEND_FROM || 'ReadEase <onboarding@resend.dev>';

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject,
            html,
            text
          })
        });

        const data = (await response.json().catch(() => null)) as {
          id?: string;
          message?: string;
          name?: string;
          statusCode?: number;
        } | null;

        if (response.ok && data?.id) {
          logger.info(
            { id: data.id, to, purpose, provider: 'resend' },
            'Email successfully transmitted via Resend API'
          );
          return { sent: true, devMode: false, provider: 'resend', id: data.id };
        }

        const errMsg = data?.message || `HTTP ${response.status} ${response.statusText}`;
        logger.warn(
          { error: errMsg, to },
          'Resend API rejected transmission. Attempting fallback...'
        );
        console.warn(`\n⚠️ [RESEND API WARNING] Could not send to ${to}: ${errMsg}`);
      } catch (error) {
        logger.error({ error, to }, 'Failed to communicate with Resend API endpoint');
        console.error(
          `\n❌ [RESEND API ERROR] Network failure connecting to Resend:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // 2. Secondary Fallback: SMTP (if configured)
    const transporter = this.getSmtpTransporter();
    if (transporter) {
      try {
        const fromAddress =
          env.SMTP_USER &&
          ((env.SMTP_HOST || '').includes('gmail') || env.SMTP_USER.endsWith('@gmail.com'))
            ? `"ReadEase" <${env.SMTP_USER}>`
            : env.SMTP_FROM;

        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          html,
          text
        });

        logger.info({ to, purpose, messageId: info.messageId }, 'Email sent via fallback SMTP');
        return { sent: true, devMode: false, provider: 'smtp', id: info.messageId };
      } catch (error) {
        logger.warn({ error, to }, 'Fallback SMTP delivery failed. Using console dev simulation.');
      }
    }

    // 3. Fallback: Local Developer Simulation
    return { sent: true, devMode: true, provider: 'simulation' };
  }

  /**
   * Lazily initialize SMTP transporter for legacy fallback.
   */
  private static getSmtpTransporter(): Transporter | null {
    if (this.smtpTransporter) {
      return this.smtpTransporter;
    }

    if (env.SMTP_USER && env.SMTP_PASS) {
      try {
        const isGmail =
          (env.SMTP_HOST || '').toLowerCase().includes('gmail') ||
          env.SMTP_USER.endsWith('@gmail.com');

        this.smtpTransporter = nodemailer.createTransport(
          isGmail
            ? {
                service: 'gmail',
                auth: {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASS
                }
              }
            : {
                host: env.SMTP_HOST || 'smtp.gmail.com',
                port: env.SMTP_PORT,
                secure: env.SMTP_SECURE,
                auth: {
                  user: env.SMTP_USER,
                  pass: env.SMTP_PASS
                }
              }
        );
        return this.smtpTransporter;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Send an OTP verification email formatted in modern luxury dark style.
   */
  static async sendOtpEmail(
    options: SendOtpEmailOptions
  ): Promise<{ sent: boolean; devMode: boolean }> {
    const { to, name, otp, purpose } = options;
    const isSignup = purpose === 'signup';
    const subject = isSignup
      ? 'Verify Your Email — ReadEase Account Registration'
      : 'Reset Your Password — ReadEase Verification Code';

    const greeting = name ? `Hello ${name},` : 'Hello,';
    const actionDescription = isSignup
      ? 'Thank you for joining ReadEase. Enter your single-use verification code below to activate your account and start your personalized reading journey.'
      : 'We received a request to reset the password for your ReadEase account. Enter your security code below to create a new password.';

    const actionUrl = isSignup ? `${env.FRONTEND_URL}/login` : `${env.FRONTEND_URL}/login`;

    const logoSrc = getEmailLogoSrc();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FFFFFF;">
  <div style="max-width: 540px; margin: 0 auto;">

    <!-- TOP MAIN CARD -->
    <div style="background-color: #121215; border: 1px solid #232328; border-radius: 28px; padding: 36px 32px; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
      
      <!-- Brand Logo Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        ${
          logoSrc
            ? `<img src="${logoSrc}" height="36" alt="ReadEase" style="height: 36px; width: auto; max-width: 190px; border: 0; outline: none; text-decoration: none; display: inline-block; vertical-align: middle;" />`
            : `<span style="font-size: 19px; font-weight: 900; letter-spacing: 5px; color: #FFFFFF; text-transform: uppercase;">READEASE</span>`
        }
      </div>

      <!-- Main Headline -->
      <h1 style="font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; margin: 0 0 28px 0; letter-spacing: -0.5px;">
        ${isSignup ? 'Email Verification' : 'Password Reset'}
      </h1>

      <!-- Hero Visual Showcase Card -->
      <div style="border-radius: 20px; overflow: hidden; background: linear-gradient(145deg, #182032 0%, #0F172A 100%); border: 1px solid rgba(56, 189, 248, 0.2); padding: 36px 20px; margin-bottom: 26px; text-align: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 3px; color: #38BDF8; text-transform: uppercase; margin-bottom: 12px;">
          ONE-TIME VERIFICATION CODE
        </div>
        <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, monospace; font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #FFFFFF; text-shadow: 0 0 25px rgba(56, 189, 248, 0.45); margin: 6px 0;">
          ${otp}
        </div>
        <div style="margin-top: 14px;">
          <span style="display: inline-block; padding: 5px 16px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; font-size: 12px; font-weight: 600; color: #38BDF8;">
            ⏱ Valid for 10 minutes
          </span>
        </div>
      </div>

      <!-- Title & Description -->
      <div style="text-align: left; margin-bottom: 24px;">
        <div style="font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; margin-bottom: 6px;">
          ReadEase Assistive Reading Suite
        </div>
        <div style="font-size: 13px; color: #8E8E93; line-height: 1.6;">
          ${greeting} ${actionDescription}
        </div>
      </div>

      <!-- Divider -->
      <div style="height: 1px; background-color: #232328; margin-bottom: 22px;"></div>

      <!-- Two-Column Meta Row (Check-in / Check-out Style) -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
        <tr>
          <td width="48%" style="vertical-align: top; text-align: left;">
            <div style="font-size: 12px; font-weight: 500; color: #71717A; margin-bottom: 5px;">Recipient</div>
            <div style="font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 3px;">${name || 'Student Reader'}</div>
            <div style="font-size: 12px; color: #8E8E93; word-break: break-all;">${to}</div>
          </td>
          <td width="4%" style="text-align: center; vertical-align: middle;">
            <div style="width: 1px; height: 50px; background-color: #27272A; margin: 0 auto;"></div>
          </td>
          <td width="48%" style="vertical-align: top; text-align: left; padding-left: 18px;">
            <div style="font-size: 12px; font-weight: 500; color: #71717A; margin-bottom: 5px;">Security Status</div>
            <div style="font-size: 15px; font-weight: 700; color: #38BDF8; margin-bottom: 3px;">Active Code</div>
            <div style="font-size: 12px; color: #8E8E93;">Single-use only</div>
          </td>
        </tr>
      </table>

    </div>

    <!-- BOTTOM DETAILS CARD -->
    <div style="background-color: #121215; border: 1px solid #232328; border-radius: 28px; padding: 32px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
      
      <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin-bottom: 22px; letter-spacing: -0.3px;">
        Verification details:
      </div>

      <!-- 2-Column Key/Value Grid -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.8;">
        <tr>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-right: 8px;">
            <span style="color: #71717A;">Request Type:</span> <strong style="color: #FFFFFF; font-weight: 600;">${isSignup ? 'New Registration' : 'Password Reset'}</strong>
          </td>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-left: 8px;">
            <span style="color: #71717A;">Delivery:</span> <strong style="color: #FFFFFF; font-weight: 600;">Resend HTTPS API</strong>
          </td>
        </tr>
        <tr>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-right: 8px;">
            <span style="color: #71717A;">Access Level:</span> <strong style="color: #FFFFFF; font-weight: 600;">Standard Account</strong>
          </td>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-left: 8px;">
            <span style="color: #71717A;">Security Protocol:</span> <strong style="color: #FFFFFF; font-weight: 600;">SHA-256 OTP</strong>
          </td>
        </tr>
        <tr>
          <td width="50%" style="vertical-align: top; padding-bottom: 8px; padding-right: 8px;">
            <span style="color: #71717A;">Verification Code:</span> <strong style="color: #38BDF8; font-weight: 700; font-family: monospace;">${otp}</strong>
          </td>
          <td width="50%" style="vertical-align: top; padding-bottom: 8px; padding-left: 8px;">
            <span style="color: #71717A;">Platform:</span> <strong style="color: #FFFFFF; font-weight: 600;">ReadEase Web Suite</strong>
          </td>
        </tr>
      </table>

      <!-- Full-Width Vibrant Blue Action Button -->
      <div style="margin-top: 26px;">
        <a href="${actionUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #2563EB; background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; padding: 15px 24px; border-radius: 14px; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.45); letter-spacing: 0.2px;">
          ${isSignup ? 'Complete Sign In' : 'Reset Account Password'}
        </a>
      </div>

    </div>

    <!-- SUBTLE FOOTER -->
    <div style="text-align: center; margin-top: 28px; font-size: 12px; color: #52525B; line-height: 1.6;">
      ReadEase Accessibility Initiative • Built for neurodivergent reading excellence<br>
      If you did not make this request, you can safely disregard this email.
    </div>

  </div>
</body>
</html>
    `;

    const text = `${greeting}\n\nYour ReadEase verification code is: ${otp}\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this message.`;

    const result = await this.deliverEmail({
      to,
      subject,
      html,
      text,
      purpose
    });

    if (result.devMode) {
      console.log('\n' + '═'.repeat(65));
      console.log(`📬 [READEASE EMAIL SERVICE - DEV SIMULATION]`);
      console.log(`   To:       ${to}`);
      console.log(`   Purpose:  ${purpose.toUpperCase()}`);
      console.log(`   Subject:  ${subject}`);
      console.log(`   🔑 CODE:   ${otp}`);
      console.log(`   Expires:  In 10 minutes`);
      console.log('═'.repeat(65) + '\n');
    }

    return { sent: result.sent, devMode: result.devMode };
  }

  /**
   * Send an account verification email formatted in modern luxury dark style.
   */
  static async sendVerificationEmail(
    options: SendVerificationEmailOptions
  ): Promise<{ sent: boolean; devMode: boolean }> {
    const { to, name, verificationUrl } = options;
    const greeting = name ? `Hello ${name},` : 'Hello,';
    const subject = 'Verify Your Email Address — ReadEase';
    const logoSrc = getEmailLogoSrc();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #0A0A0C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #FFFFFF;">
  <div style="max-width: 540px; margin: 0 auto;">

    <!-- TOP MAIN CARD -->
    <div style="background-color: #121215; border: 1px solid #232328; border-radius: 28px; padding: 36px 32px; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
      
      <!-- Brand Logo Header -->
      <div style="text-align: center; margin-bottom: 24px;">
        ${
          logoSrc
            ? `<img src="${logoSrc}" height="36" alt="ReadEase" style="height: 36px; width: auto; max-width: 190px; border: 0; outline: none; text-decoration: none; display: inline-block; vertical-align: middle;" />`
            : `<span style="font-size: 19px; font-weight: 900; letter-spacing: 5px; color: #FFFFFF; text-transform: uppercase;">READEASE</span>`
        }
      </div>

      <!-- Main Headline -->
      <h1 style="font-size: 28px; font-weight: 800; color: #FFFFFF; text-align: center; margin: 0 0 28px 0; letter-spacing: -0.5px;">
        Verify Your Email!
      </h1>

      <!-- Hero Visual Showcase Card -->
      <div style="border-radius: 20px; overflow: hidden; background: linear-gradient(145deg, #182032 0%, #0F172A 100%); border: 1px solid rgba(56, 189, 248, 0.2); padding: 36px 20px; margin-bottom: 26px; text-align: center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);">
        <div style="font-size: 11px; font-weight: 800; letter-spacing: 3px; color: #38BDF8; text-transform: uppercase; margin-bottom: 12px;">
          EMAIL VERIFICATION LINK
        </div>
        <div style="font-size: 32px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px; margin: 8px 0;">
          Welcome to ReadEase
        </div>
        <div style="margin-top: 14px;">
          <span style="display: inline-block; padding: 5px 16px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 9999px; font-size: 12px; font-weight: 600; color: #38BDF8;">
            ⏱ Link valid for 1 hour
          </span>
        </div>
      </div>

      <!-- Title & Description -->
      <div style="text-align: left; margin-bottom: 24px;">
        <div style="font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; margin-bottom: 6px;">
          Activate Your Account
        </div>
        <div style="font-size: 13px; color: #8E8E93; line-height: 1.6;">
          ${greeting} Thank you for joining ReadEase! To activate your account and start your personalized reading journey, click the confirmation button below.
        </div>
      </div>

      <!-- Divider -->
      <div style="height: 1px; background-color: #232328; margin-bottom: 22px;"></div>

      <!-- Two-Column Meta Row -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
        <tr>
          <td width="48%" style="vertical-align: top; text-align: left;">
            <div style="font-size: 12px; font-weight: 500; color: #71717A; margin-bottom: 5px;">Recipient</div>
            <div style="font-size: 15px; font-weight: 700; color: #FFFFFF; margin-bottom: 3px;">${name || 'Student Reader'}</div>
            <div style="font-size: 12px; color: #8E8E93; word-break: break-all;">${to}</div>
          </td>
          <td width="4%" style="text-align: center; vertical-align: middle;">
            <div style="width: 1px; height: 50px; background-color: #27272A; margin: 0 auto;"></div>
          </td>
          <td width="48%" style="vertical-align: top; text-align: left; padding-left: 18px;">
            <div style="font-size: 12px; font-weight: 500; color: #71717A; margin-bottom: 5px;">Security Status</div>
            <div style="font-size: 15px; font-weight: 700; color: #38BDF8; margin-bottom: 3px;">Pending Activation</div>
            <div style="font-size: 12px; color: #8E8E93;">Single-use link</div>
          </td>
        </tr>
      </table>

    </div>

    <!-- BOTTOM DETAILS CARD -->
    <div style="background-color: #121215; border: 1px solid #232328; border-radius: 28px; padding: 32px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
      
      <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin-bottom: 22px; letter-spacing: -0.3px;">
        Account details:
      </div>

      <!-- 2-Column Key/Value Grid -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; line-height: 1.8;">
        <tr>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-right: 8px;">
            <span style="color: #71717A;">Request:</span> <strong style="color: #FFFFFF; font-weight: 600;">Email Verification</strong>
          </td>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-left: 8px;">
            <span style="color: #71717A;">Delivery:</span> <strong style="color: #FFFFFF; font-weight: 600;">Resend HTTPS API</strong>
          </td>
        </tr>
        <tr>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-right: 8px;">
            <span style="color: #71717A;">Access Level:</span> <strong style="color: #FFFFFF; font-weight: 600;">Full ReadEase Suite</strong>
          </td>
          <td width="50%" style="vertical-align: top; padding-bottom: 14px; padding-left: 8px;">
            <span style="color: #71717A;">Platform:</span> <strong style="color: #FFFFFF; font-weight: 600;">Web Application</strong>
          </td>
        </tr>
      </table>

      <!-- Full-Width Vibrant Blue Action Button -->
      <div style="margin-top: 24px;">
        <a href="${verificationUrl}" style="display: block; width: 100%; box-sizing: border-box; text-align: center; background-color: #2563EB; background: linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; padding: 15px 24px; border-radius: 14px; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.45); letter-spacing: 0.2px;">
          Verify My Email Address
        </a>
      </div>

      <div style="margin-top: 18px; padding: 12px; background-color: #1A1A20; border: 1px solid #2A2A32; border-radius: 10px; font-size: 11px; color: #71717A; word-break: break-all; text-align: center;">
        Or copy link: ${verificationUrl}
      </div>

    </div>

    <!-- SUBTLE FOOTER -->
    <div style="text-align: center; margin-top: 28px; font-size: 12px; color: #52525B; line-height: 1.6;">
      ReadEase Accessibility Initiative • Built for neurodivergent reading excellence<br>
      If you did not make this request, you can safely disregard this email.
    </div>

  </div>
</body>
</html>
    `;

    const text = `${greeting}\n\nVerify your ReadEase email address by visiting this link:\n${verificationUrl}\n\nThis link expires in 1 hour.\n\nIf you did not create a ReadEase account, please ignore this email.`;

    const result = await this.deliverEmail({
      to,
      subject,
      html,
      text,
      purpose: 'email_verification'
    });

    if (result.devMode) {
      console.log('\n' + '═'.repeat(75));
      console.log(`📬 [READEASE EMAIL SERVICE - DEV SIMULATION]`);
      console.log(`   To:       ${to}`);
      console.log(`   Subject:  ${subject}`);
      console.log(`   🔗 VERIFY: ${verificationUrl}`);
      console.log(`   Expires:  In 1 hour`);
      console.log('═'.repeat(75) + '\n');
    }

    return { sent: result.sent, devMode: result.devMode };
  }
}
