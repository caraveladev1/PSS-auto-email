import transporter from '../mail/mail.mjs';
import connectDB from '../db/dbconfig.mjs';
import pc from 'picocolors';

//Función para obtener datos de la base de datos
async function getDataMilling() {
	try {
		const pool = await connectDB();
		const sqlDataOFFER = 'SELECT * FROM listMilling';
		const result = await pool.request().query(sqlDataOFFER);
		const data = result.recordset;
		//console.log(data); // Imprimir los datos en la consola
		return data;
	} catch (error) {
		console.error('Error:', error);
	}
}

//Función para actualizar estado de email
async function updateEmailStatus(sample) {
	try {
		const pool = await connectDB();
		const sqlUpdateEmailStatus = `UPDATE listMilling SET [mail_sent] = 2 WHERE [sample] = @sample`;
		const request = pool.request().input('sample', sample);
		await request.query(sqlUpdateEmailStatus);
	} catch (error) {
		console.error('Error:', error);
	}
}

//Función para actualizar el estado del feedback de email
async function updateFeedbackEmailStatus(sample) {
	try {
		const pool = await connectDB();
		const sqlUpdateEmailStatus = `UPDATE listMilling SET [feedback_mail] = 2 WHERE [sample] = @sample`;
		const request = pool.request().input('sample', sample);
		await request.query(sqlUpdateEmailStatus);
	} catch (error) {
		console.error('Error:', error);
	}
}

async function organizarDatos() {
	const datos = await getDataMilling();
	const datosOrganizados = [];

	// Iterar sobre cada muestra en los datos originales
	for (const sample of datos) {
		const { customer, ...sampleData } = sample;

		// Verificar si ya existe una entrada para este cliente en datosOrganizados
		const clienteExistenteIndex = datosOrganizados.findIndex(
			(cliente) => cliente.customer === customer,
		);

		if (clienteExistenteIndex !== -1) {
			// Si ya existe, agregar los datos de la muestra al array sampleData correspondiente
			datosOrganizados[clienteExistenteIndex].sampleData.push(sampleData);
		} else {
			// Si no existe, crear una nueva entrada con un objeto vacío para sampleData
			datosOrganizados.push({
				customer: customer,
				sampleData: [sampleData],
			});
		}
	}

	// Devolver los datos organizados
	//console.log(JSON.stringify(datosOrganizados));
	const datosFinales = JSON.stringify(datosOrganizados);
	return datosFinales;
}

async function enviarCorreo(cliente) {
	try {
		// Verificar si hay alguna muestra con email_sent igual a 1
		const muestrasPendientes = cliente.sampleData.filter(
			(sample) => sample.mail_sent === '1',
		);

		if (muestrasPendientes.length > 0) {
			const customer_email = cliente.sampleData[0].customer_email_addresses;
			const caravela_mail = cliente.sampleData[0].caravela_mail;
			//console.log(customer_email, caravela_mail);
			const mensaje = {
				from: 'notification@caravela.coffee',
				to: [],
				bcc: ['juan.diaz@caravela.coffee' /* caravela_mail, customer_email */],
				subject: 'Notification of Offer Sample Sent',
				text: `
Dear ${cliente.customer},

We are pleased to inform you that the offer samples for the next opportunities have been successfully sent. Below are the shipment details:

${muestrasPendientes
	.map(
		(muestra) => `
- Opportunitie: ${muestra.contract}
- Mark: ${muestra.mark}
- Sample ID: ${muestra.sample}
- Tracking ID: ${muestra.tracking_id}
- Courrier: ${muestra.courier}
`,
	)
	.join('\n')}

To track the shipment, you can use the provided tracking numbers on the shipping company's website.

Please let us know if you approve this sample. Please provide your feedback here: https://forms.office.com/r/CaA4Pj0QsL?origin=lprLink.

Best regards,
CARAVELA COFFEE
`,
			};

			// Enviar el correo
			await transporter.sendMail(mensaje);
			console.log(
				pc.cyan('[MUESTRAS MILLING]'),
				`Successfully Notification email sent to ${cliente.customer}`,
			);
			// Actualizar el estado del correo electrónico para la muestra actual
			for (const muestra of muestrasPendientes) {
				const sampleIdToUpdate = muestra.sample;
				console.log(
					pc.cyan('[MUESTRAS MILLING]'),
					`Updating Notification email status for Sample ID: ${sampleIdToUpdate}`,
				);
				await updateEmailStatus(sampleIdToUpdate);
			}
		} /* else {
      console.log(pc.cyan('[MUESTRAS MILLING]'), `No hay muestras pendientes por enviar`);
    } */
	} catch (error) {
		console.error('[MUESTRAS MILLING] Error sending email:', error);
	}
}

export async function startMillingAutomation() {
	try {
		const datosFinales = await organizarDatos();
		const datosFinalesObjeto = JSON.parse(datosFinales);
		for (const cliente of datosFinalesObjeto) {
			//console.log(pc.cyan('[MUESTRAS MILLING]'), `Validando Datos de: ${cliente.customer}`);
			await enviarCorreo(cliente);
		}
	} catch (error) {
		console.error('[MUESTRAS MILLING] Error al enviar correos:', error);
	}
}

startMillingAutomation();
