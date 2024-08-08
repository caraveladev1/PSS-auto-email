import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
	host: 'smtp.office365.com',
	port: 587,
	secure: false,
	auth: {
		user: process.env.MAIL,
		pass: process.env.PASSWORD_MAIL,
	},
	etls: { ciphers: 'STARTTLS' },
	connectionTimeout: 60000,
});

export default transporter;
