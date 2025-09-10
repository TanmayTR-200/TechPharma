import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

type OtpEntry = { otp: string; expiresAt: number };

// Persist OTP store across hot reloads in dev
const otpStore: Map<string, OtpEntry> =
  (globalThis as any).__otpStore || new Map<string, OtpEntry>();
(globalThis as any).__otpStore = otpStore;

const isProd = process.env.NODE_ENV === 'production';

// Build SMTP transporter
function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null; // not configured
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: String(SMTP_SECURE ?? 'false') === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email
async function sendOtpEmail(email: string, otp: string) {
  const transporter = buildTransporter();
  if (!transporter) throw new Error('SMTP not configured');

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER!,
    to: email,
    subject: 'Your TechPharma OTP',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
  });
}

// POST handler
export async function POST(request: Request) {
  try {
    const { email, action, otp } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    // SEND OTP
    if (action === 'send') {
      const code = generateOtp();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      otpStore.set(email, { otp: code, expiresAt });

      try {
        await sendOtpEmail(email, code);
        return NextResponse.json({ success: true, message: 'OTP sent successfully' });
      } catch (err: any) {
        console.error('[OTP] Email send failed:', err?.message || err);

        if (!isProd) {
          console.log(`[OTP][DEV] Email: ${email} → OTP: ${code}`);
          return NextResponse.json({
            success: true,
            message: 'OTP generated (dev mode)',
            devOtp: code,
          });
        }

        return NextResponse.json({ success: false, message: 'Failed to send OTP' }, { status: 500 });
      }
    }

    // VERIFY OTP
    if (action === 'verify') {
      if (!otp) {
        return NextResponse.json({ success: false, message: 'OTP is required' }, { status: 400 });
      }

      const entry = otpStore.get(email);
      if (!entry) {
        return NextResponse.json({ success: false, message: 'No OTP requested for this email' }, { status: 400 });
      }

      if (Date.now() > entry.expiresAt) {
        otpStore.delete(email);
        return NextResponse.json({ success: false, message: 'OTP expired' }, { status: 400 });
      }

      if (entry.otp !== otp) {
        return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
      }

      otpStore.delete(email);
      return NextResponse.json({ success: true, message: 'OTP verified' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[OTP] API error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
