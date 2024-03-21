import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: {
    user: 'soporte@caravela.coffee',
    pass: 'V1ll@v1c3nc10*',
  },
  etls: { ciphers: 'STARTTLS' },
  connectionTimeout: 60000,
});

export default transporter