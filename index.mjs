import nodemailer from 'nodemailer';
import connectDB from './dbconfig.mjs';

//Configuración del transporte de correo electrónico para Outlook
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

//Función para obtener datos de la base de datos
async function getDataPSS() {
	try {
		const pool = await connectDB();
		const sqlDataPSS = 'SELECT * FROM listPSS';
		const result = await pool.request().query(sqlDataPSS);
		return result.recordset;
	} catch (error) {
		console.error('Error:', error);
	}
}

//Funcion para actualizar estado de email
async function updateEmailStatus(sample_id) {
	try {
		const pool = await connectDB();
		const sqlUpdateEmailStatus = `UPDATE listPSS SET [email_sent] = 2 WHERE [sample_id] = '${sample_id}'`;
		await pool.request().query(sqlUpdateEmailStatus);
	} catch (error) {
		console.error('Error:', error);
	}
}
//Función para actualziar el estado del feedback de email
async function updateFeedbackEmailStatus(sample_id) {
	try {
		const pool = await connectDB();
		const sqlUpdateEmailStatus = `UPDATE listPSS SET [email_no_feedback] = 2 WHERE [sample_id] = '${sample_id}'`;
		await pool.request().query(sqlUpdateEmailStatus);
	} catch (error) {
		console.error('Error:', error);
	}
}

//Funcion para organizar datos y creación de json
async function organizarDatos() {
	const datos = await getDataPSS();

	const datosOrganizados = datos.reduce((acumulador, dato) => {
		const clienteKey = dato.customer;

		if (!acumulador[clienteKey]) {
			acumulador[clienteKey] = {
				customer: dato.customer,
				customerEmail: dato.customer_email,
				caravela_mail: dato.caravela_mail,
				destination_office: dato.destination_office,
				sampleData: [],
			};
		}

		// Verificar si email_sent y email_no_feedback son ambos iguales a '2'
		if (dato.email_sent === '2' && dato.email_no_feedback === '2') {
			return acumulador;
		}

		const existingSample = acumulador[clienteKey].sampleData.find(
			(sample) => sample.sample_tracking_id === dato.sample_tracking_id,
		);

		if (existingSample) {
			existingSample.data.push({
				contracts: dato.Contract,
				origin: dato.origin,
				mark: dato.Mark,
				sample_id: dato.sample_id,
				courrier_name: dato.courrier_name,
				sample_shipping_state: dato.sample_shipping_state,
				sample_shipping_date: dato.sample_shipping_date,
				shipment_month: dato.shipment_month,
				customer_sample_feedback: dato.customer_sample_feedback,
				customer_feedback_date: dato.customer_feedback_date,
				email_sent: dato.email_sent,
				email_no_feedback: dato.email_no_feedback,
			});
		} else {
			acumulador[clienteKey].sampleData.push({
				sample_tracking_id: dato.sample_tracking_id,
				data: [
					{
						contracts: dato.Contract,
						origin: dato.origin,
						mark: dato.Mark,
						sample_id: dato.sample_id,
						courrier_name: dato.courrier_name,
						sample_shipping_state: dato.sample_shipping_state,
						sample_shipping_date: dato.sample_shipping_date,
						shipment_month: dato.shipment_month,
						customer_sample_feedback: dato.customer_sample_feedback,
						customer_feedback_date: dato.customer_feedback_date,
						email_sent: dato.email_sent,
						email_no_feedback: dato.email_no_feedback,
					},
				],
			});
		}

		return acumulador;
	}, {});

	const datosFinales = JSON.stringify(datosOrganizados);
	//console.log(datosFinales);
	return datosFinales;
}

// Función para enviar correos electrónicos con la información obtenida
async function enviarCorreo(cliente) {
	try {
		// Verificar si hay alguna muestra con email_sent igual a 1
		const muestrasPendientes = cliente.sampleData.flatMap((sampleGroup) =>
			sampleGroup.data.filter((sample) => sample.email_sent === '1'),
		);

		if (muestrasPendientes.length > 0) {
			const customer_email = cliente.customerEmail;
			const caravela_mail = cliente.caravela_mail;
			const mensaje = {
				from: 'soporte@caravela.coffee',
				to: [],
				bcc: [
					'juan.diaz@caravela.coffee',
					caravela_mail,

					/* , 'alejandro.cadena@caravela.coffee' */
				],
				subject: 'Notification of Preshipment Sample Sent',
				text: `
Dear ${cliente.customer},

We are pleased to inform you that the pre-shipment samples for the next contracts have been successfully sent. Below are the shipment details:

${cliente.sampleData
	.filter((sampleGroup) =>
		sampleGroup.data.some((sample) => sample.email_sent === '1'),
	)
	.map((sampleGroup) => {
		const sampleTrackingId = sampleGroup.sample_tracking_id;
		const sampleCourrier = sampleGroup.data[0].courrier_name;
		const sampleOrigin = sampleGroup.data[0].origin;
		const sampleInfo = sampleGroup.data
			.map(
				(sample) => `
    - Contract: ${sample.contracts}
    - Mark: ${sample.mark}
    - Sample ID: ${sample.sample_id}
    - Shipment Month: ${sample.shipment_month}
`,
			)
			.join('\n');

		return `Sample Tracking ID: ${sampleTrackingId}\nSample Courrier: ${sampleCourrier}\nSample Origin : ${sampleOrigin}\n${sampleInfo}`;
	})
	.join('\n\n')}
    
To track the shipment, you can use the provided tracking numbers on the shipping company's website.

Please let us know if you approve this sample. Please provide your feedback here: https://forms.office.com/r/CaA4Pj0QsL?origin=lprLink.

Best regards,
CARAVELA COFFEE
`,
			};

			// Enviar el correo
			await transporter.sendMail(mensaje);
			console.log(
				`successfully Notification email sent to ${cliente.customer}`,
			);
			// Update the email status for the current sample
			for (const sample of muestrasPendientes) {
				const sampleIdToUpdate = sample.sample_id;
				console.log(
					`Updating Notification email status for Sample ID: ${sampleIdToUpdate}`,
				);
				await updateEmailStatus(sampleIdToUpdate);
			}
		} else {
			console.log(`Notification email to ${cliente.customer} is already sent`);
		}
	} catch (error) {
		console.error('Error sending email:', error);
	}
}

//Funcion para enviar los correos de Feedback
async function enviarFeedbackCorreo(cliente) {
	try {
		const muestrasPendientesFeedback = cliente.sampleData.flatMap(
			(sampleGroup) =>
				sampleGroup.data.filter(
					(sample) =>
						sample.email_no_feedback === '1' &&
						sample.customer_sample_feedback === 'Pending' &&
						sample.email_sent === '2' &&
						Math.floor(
							(Date.now() - new Date(sample.sample_shipping_date).getTime()) /
								(24 * 60 * 60 * 1000),
						) > 14,
				),
		);
		if (muestrasPendientesFeedback.length > 0) {
			const customer_email = cliente.customerEmail;
			const caravela_mail = cliente.caravela_mail;
			const mensaje = {
				from: 'soporte@caravela.coffee',
				to: [],
				bcc: [
					'juan.diaz@caravela.coffee',
					caravela_mail /* , 'alejandro.cadena@caravela.coffee' */,
				],
				subject: 'Feedback of Preshipment Sample Sent',
				text: `
Dear ${cliente.customer},

We are pleased to inform you that the pre-shipment samples for the next contracts have been successfully sent. Below are the shipment details:

${cliente.sampleData
	.filter((sampleGroup) =>
		sampleGroup.data.some((sample) => sample.email_no_feedback === '1'),
	)
	.map((sampleGroup) => {
		const sampleTrackingId = sampleGroup.sample_tracking_id;
		const sampleCourrier = sampleGroup.data[0].courrier_name;
		const sampleOrigin = sampleGroup.data[0].origin;
		const sampleInfo = sampleGroup.data
			.map(
				(sample) => `
    - Contract: ${sample.contracts}
    - Mark: ${sample.mark}
    - Sample ID: ${sample.sample_id}
    - Shipment Month: ${sample.shipment_month}
`,
			)
			.join('\n');

		return `Sample Tracking ID: ${sampleTrackingId}\nSample Courrier: ${sampleCourrier}\nSample Origin : ${sampleOrigin}\n${sampleInfo}`;
	})
	.join('\n\n')}
    
To track the shipment, you can use the provided tracking numbers on the shipping company's website.

Please let us know if you approve this sample. Please provide your feedback here: https://forms.office.com/r/CaA4Pj0QsL?origin=lprLink.


Best regards,
CARAVELA COFFEE
`,
			};

			// Enviar el correo
			await transporter.sendMail(mensaje);
			console.log(`successfully Feedback email sent to ${cliente.customer}`);
			for (const sample of muestrasPendientesFeedback) {
				const sampleIdToUpdate = sample.sample_id;
				console.log(
					`Updating Feedback email status for Sample ID: ${sampleIdToUpdate}`,
				);
				await updateFeedbackEmailStatus(sampleIdToUpdate);
			}
		} else {
			console.log(`Feedback email to ${cliente.customer} is already sent`);
		}
	} catch (error) {
		console.error('Error sending email:', error);
	}
}

// Lógica principal
async function main() {
	try {
		const datosFinales = await organizarDatos();
		const clientes = JSON.parse(datosFinales);

		for (const clienteKey in clientes) {
			const cliente = clientes[clienteKey];
			await enviarCorreo(cliente);
			await enviarFeedbackCorreo(cliente);
		}
	} catch (error) {
		console.error('Error:', error);
		process.exit(1);
	}
}

main().then(() => {
	// Cerrar el programa después de completar la ejecución
	process.exit();
});
