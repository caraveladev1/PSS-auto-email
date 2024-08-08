import nodemailer from 'nodemailer';
import connectDB from '../db/dbconfig.mjs';
import pc from 'picocolors';
import transporter from '../mail/mail.mjs';

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
    const sqlUpdateEmailStatus = `UPDATE listPSS SET [email_sent] = 2 WHERE [sample_id] = @sample_id`;
    const request = pool.request().input('sample_id', sample_id);
    await request.query(sqlUpdateEmailStatus);
  } catch (error) {
    console.error('Error:', error);
  }
}

//Función para actualizar el estado del feedback de email
async function updateFeedbackEmailStatus(sample_id) {
  try {
    const pool = await connectDB();
    const sqlUpdateEmailStatus = `UPDATE listPSS SET [email_no_feedback] = 2 WHERE [sample_id] = @sample_id`;
    const request = pool.request().input('sample_id', sample_id);
    await request.query(sqlUpdateEmailStatus);
  } catch (error) {
    console.error('Error:', error);
  }
}

//Función para organizar datos y creación de json
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
      (sample) => sample.sample_tracking_id === dato.sample_tracking_id
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
      sampleGroup.data.filter((sample) => sample.email_sent === '1')
    );

    if (muestrasPendientes.length > 0) {
      const customer_email = cliente.customerEmail;
      const caravela_mail = cliente.caravela_mail;
      const mensaje = {
        from: 'notification@caravela.coffee',
        to: [],
        bcc: ['juan.diaz@caravela.coffee' , caravela_mail, customer_email],
        subject: 'Notification of Preshipment Sample Sent',
        text: `
Dear ${cliente.customer},

We are pleased to inform you that the pre-shipment samples for the next contracts have been successfully sent. Below are the shipment details:

${cliente.sampleData
          .filter((sampleGroup) =>
            sampleGroup.data.some((sample) => sample.email_sent === '1')
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
`
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
      for (const sample of muestrasPendientes) {
        const sampleIdToUpdate = sample.sample_id;
        console.log(
          pc.blue('[MUESTRAS PSS]'),
          `Successfully Notification email sent for Sample ID: ${sampleIdToUpdate} to ${cliente.customer}`
        );
        // Actualizar el estado del correo electrónico para la muestra actual
        await updateEmailStatus(sampleIdToUpdate);
      }
    }

    return muestrasPendientes.length > 0;
  } catch (error) {
    console.error('[MUESTRAS PSS] Error sending email:', error);
    return false;
  }
}

// Función para enviar los correos de Feedback
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
                (24 * 60 * 60 * 1000)
            ) > 14
        )
    );
    if (muestrasPendientesFeedback.length > 0) {
      const customer_email = cliente.customerEmail;
      const caravela_mail = cliente.caravela_mail;
      const mensaje = {
        from: 'notification@caravela.coffee',
        to: [],
        bcc: ['juan.diaz@caravela.coffee' , caravela_mail, customer_email ],
        subject: 'Feedback of Preshipment Sample Sent',
        text: `
Dear ${cliente.customer},

We are pleased to inform you that the pre-shipment samples for the next contracts have been successfully sent. Below are the shipment details:

${cliente.sampleData
          .filter((sampleGroup) =>
            sampleGroup.data.some((sample) => sample.email_no_feedback === '1')
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
`
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
      for (const sample of muestrasPendientesFeedback) {
        const sampleIdToUpdate = sample.sample_id;
        console.log(
          pc.blue('[MUESTRAS PSS]'),
          `Successfully Feedback email sent for Sample ID: ${sampleIdToUpdate} to ${cliente.customer}`
        );
        // Actualizar el estado del correo de feedback para la muestra actual
        await updateFeedbackEmailStatus(sampleIdToUpdate);
      }
    }

    return muestrasPendientesFeedback.length > 0;
  } catch (error) {
    console.error('[MUESTRAS PSS] Error sending feedback email:', error);
    return false;
  }
}

// Lógica principal
export async function startPSSAutomation() {
  try {
    const datosFinales = await organizarDatos();
    const clientes = JSON.parse(datosFinales);

    let correosEnviados = false;
    let feedbackCorreosEnviados = false;

    for (const clienteKey in clientes) {
      const cliente = clientes[clienteKey];
      correosEnviados = (await enviarCorreo(cliente)) || correosEnviados;
      feedbackCorreosEnviados =
        (await enviarFeedbackCorreo(cliente)) || feedbackCorreosEnviados;
    }

    if (!correosEnviados) {
      console.log(pc.blue('[MUESTRAS PSS]'), 'No hay correos "nuevos" pendientes por enviar');
    }

    if (!feedbackCorreosEnviados) {
      console.log(pc.blue('[MUESTRAS PSS]'), 'No hay correos de "recordatorio" por enviar');
    }
  } catch (error) {
    console.error('[MUESTRAS PSS] Error:', error);
    process.exit(1);
  }
}
