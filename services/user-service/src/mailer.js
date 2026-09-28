const nodemailer = require('nodemailer');

const hasSmtpConfig = () => Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
);

const createTransporter = () => {
    if (!hasSmtpConfig()) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

const getMailFrom = () =>
    process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@cakedelight.com';

const buildOtpEmailTemplate = ({ name, otp, ttlMinutes }) => {
    const safeName = name || 'there';
    const safeTtlMinutes = Number(ttlMinutes) || 10;

    return {
        subject: 'Your Cake Delight verification code',
        text: [
            `Hello ${safeName},`,
            '',
            `Your Cake Delight verification code is: ${otp}`,
            '',
            `This code expires in ${safeTtlMinutes} minutes.`,
            'If you did not request this code, you can ignore this email.'
        ].join('\n'),
        html: `
            <div style="margin:0;padding:0;background:#f6f3ee;">
                <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                    Your Cake Delight verification code is ${otp}. It expires in ${safeTtlMinutes} minutes.
                </div>
                <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
                    <div style="background:#ffffff;border:1px solid #eadfce;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(73,52,28,0.08);">
                        <div style="padding:28px 32px;background:linear-gradient(135deg,#3f2a1d 0%,#8b5e3c 100%);color:#fff;">
                            <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">Cake Delight</div>
                            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Verify your email</h1>
                        </div>
                        <div style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#2d221a;">
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello ${safeName},</p>
                            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#5d4a3a;">
                                Use the code below to complete your registration. This keeps your account secure and confirms that you can access this inbox.
                            </p>
                            <div style="margin:0 auto 24px;max-width:320px;text-align:center;border:1px solid #eadfce;border-radius:18px;background:#fffaf4;padding:24px 20px;">
                                <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8b5e3c;margin-bottom:12px;">Verification Code</div>
                                <div style="font-size:34px;letter-spacing:0.3em;font-weight:700;color:#3f2a1d;font-family:'Courier New',monospace;">${otp}</div>
                            </div>
                            <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#6f5c4f;">
                                This code expires in ${safeTtlMinutes} minutes.
                            </p>
                            <p style="margin:0;font-size:14px;line-height:1.6;color:#6f5c4f;">
                                If you did not request this code, you can safely ignore this message.
                            </p>
                        </div>
                    </div>
                    <div style="padding:14px 10px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8b7c6d;">
                        Cake Delight Security Notice: never share this code with anyone.
                    </div>
                </div>
            </div>
        `
    };
};

const buildPasswordResetEmailTemplate = ({ name, resetUrl, ttlMinutes }) => {
    const safeName = name || 'there';
    const safeTtlMinutes = Number(ttlMinutes) || 15;

    return {
        subject: 'Reset your Cake Delight password',
        text: [
            `Hello ${safeName},`,
            '',
            'We received a request to reset your Cake Delight password.',
            `Use this link to continue: ${resetUrl}`,
            '',
            `This link expires in ${safeTtlMinutes} minutes.`,
            'If you did not request a password reset, you can ignore this email.'
        ].join('\n'),
        html: `
            <div style="margin:0;padding:0;background:#f6f3ee;">
                <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                    Reset your Cake Delight password using the link in this email.
                </div>
                <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
                    <div style="background:#ffffff;border:1px solid #eadfce;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(73,52,28,0.08);">
                        <div style="padding:28px 32px;background:linear-gradient(135deg,#3f2a1d 0%,#8b5e3c 100%);color:#fff;">
                            <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">Cake Delight</div>
                            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Reset your password</h1>
                        </div>
                        <div style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#2d221a;">
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello ${safeName},</p>
                            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#5d4a3a;">
                                We received a request to reset your password. Use the button below to choose a new one.
                            </p>
                            <div style="margin:0 0 24px;text-align:center;">
                                <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#8b5e3c;color:#fff;text-decoration:none;font-weight:700;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#6f5c4f;">
                                This link expires in ${safeTtlMinutes} minutes.
                            </p>
                            <p style="margin:0;font-size:14px;line-height:1.6;color:#6f5c4f;word-break:break-all;">
                                If the button does not work, copy and paste this URL into your browser:<br />
                                ${resetUrl}
                            </p>
                        </div>
                    </div>
                    <div style="padding:14px 10px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8b7c6d;">
                        If you did not request this change, you can safely ignore this message.
                    </div>
                </div>
            </div>
        `
    };
};

module.exports = {
    hasSmtpConfig,
    createTransporter,
    getMailFrom,
    buildOtpEmailTemplate,
    buildPasswordResetEmailTemplate
};
