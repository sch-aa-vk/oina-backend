import nodemailer from 'nodemailer';
import { getSMTPConfig } from '../../config/smtp.config';

export const createTransporter = () => {
  const config = getSMTPConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
};
