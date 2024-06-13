import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: 'notification@caravela.coffee',
    pass: 'Caravela2024',
  },
  etls: { ciphers: 'STARTTLS' },
  connectionTimeout: 60000,
});

export default transporter