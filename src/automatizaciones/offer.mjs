import transporter from '../mail/mail.mjs';
import connectDB from '../db/dbconfig.mjs';
import pc from 'picocolors';

// Función para obtener datos de la base de datos
async function getDataOFFER() {
    try {
        const pool = await connectDB();
        const sqlDataOFFER = 'SELECT * FROM listOFFER';
        const result = await pool.request().query(sqlDataOFFER);
        const data = result.recordset;
        return data;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función para actualizar estado de email
async function updateEmailStatus(sample) {
    try {
        const pool = await connectDB();
        const sqlUpdateEmailStatus = `UPDATE listOFFER SET [email_sent] = 2 WHERE [sample] = @sample`;
        const request = pool.request().input('sample', sample);
        await request.query(sqlUpdateEmailStatus);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función para actualizar el estado del feedback de email
async function updateFeedbackEmailStatus(sample) {
    try {
        const pool = await connectDB();
        const sqlUpdateEmailStatus = `UPDATE listOFFER SET [feedback_mail] = 2 WHERE [sample] = @sample`;
        const request = pool.request().input('sample', sample);
        await request.query(sqlUpdateEmailStatus);
    } catch (error) {
        console.error('Error:', error);
    }
}

async function organizarDatos() {
    const datos = await getDataOFFER();
    const datosOrganizados = [];

    // Verificar si hay correos pendientes
    if (!datos || datos.length === 0) {
        return { datosOrganizados, hayCorreosPendientes: false };
    }

    // Iterar sobre cada muestra en los datos originales
    for (const muestra of datos) {
        const { customer, ...sampleData } = muestra;

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

    // Verificar si hay algún correo pendiente
    const hayCorreosPendientes = datosOrganizados.some((cliente) =>
        cliente.sampleData.some((muestra) => muestra.email_sent === '1'),
    );

    return { datosOrganizados, hayCorreosPendientes };
}

async function enviarCorreo(cliente) {
    try {
        // Verificar si hay alguna muestra con email_sent igual a 1
        const muestrasPendientes = cliente.sampleData.filter(
            (muestra) => muestra.email_sent === '1',
        );

        if (muestrasPendientes.length > 0) {
            const customer_email = cliente.sampleData[0].customer_email_addresses;
            const caravela_mail = cliente.sampleData[0].caravela_mail;

            const mensaje = {
                from: 'notification@caravela.coffee',
                to: [],
                bcc: ['juan.diaz@caravela.coffee',  caravela_mail, customer_email ],
                subject: 'Notification of Offer Sample Sent',
                text: `
Dear ${cliente.customer},

We are pleased to inform you that the offer samples for the next opportunities have been successfully sent. Below are the shipment details:

${muestrasPendientes
        .map(
            (muestra) => `
- Opportunitie: ${muestra.opportunitie}
- Mark: ${muestra.mark}
- Sample ID: ${muestra.sample}
- Tracking ID: ${muestra.tracking_id}
- Courrier: ${muestra.currier}
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
                pc.magenta('[MUESTRAS OFFER]'),
                `Successfully Notification email sent to ${cliente.customer}`,
            );
            // Actualizar el estado del correo electrónico para la muestra actual
            for (const muestra of muestrasPendientes) {
                const sampleIdToUpdate = muestra.sample;
                console.log(
                    pc.magenta('[MUESTRAS OFFER]'),
                    `Updating Notification email status for Sample ID: ${sampleIdToUpdate}`,
                );
                await updateEmailStatus(sampleIdToUpdate);
            }
        }
    } catch (error) {
        console.error('[MUESTRAS OFFER] Error sending email:', error);
    }
}

export async function startOfferAutomation() {
    try {
        const { datosOrganizados, hayCorreosPendientes } = await organizarDatos();

        if (!hayCorreosPendientes) {
            console.log(pc.magenta('[MUESTRAS OFFER]'), 'No hay correos pendientes por enviar');
            return;
        }

        for (const cliente of datosOrganizados) {
            await enviarCorreo(cliente);
        }
    } catch (error) {
        console.error('[MUESTRAS OFFER] Error al enviar correos:', error);
    }
}

