import { getSMTPConfig } from '../../config/smtp.config';
import { createTransporter } from './_transporter';

export const sendPasswordResetEmail = async (email: string, code: string): Promise<void> => {
  const transporter = createTransporter();
  const config = getSMTPConfig();

  await transporter.sendMail({
    from: `"OINA" <${config.from}>`,
    to: email,
    subject: 'Reset your OINA password',
    text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your OINA password</h2>
        <p>Enter the following code to reset your password:</p>
        <div style="background: #f4f4f4; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${code}</span>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in <strong>15 minutes</strong>.</p>
        <p style="color: #888; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
};
