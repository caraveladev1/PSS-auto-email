import nodemailer from 'nodemailer';
import connectDB from '../db/dbconfig.mjs';
import pc from 'picocolors';

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
async function getDataSampleStatus() {
  try {
    const pool = await connectDB();
    const sqlDataSC = 'SELECT * FROM listSampleState';
    const result = await pool.request().query(sqlDataSC);
    return result.recordset;
  } catch (error) {
    console.error('Error:', error);
  }
}

//Funcion para actualizar estado de email
async function updateEmailStatus(sample_id) {
  try {
    const pool = await connectDB();
    const sqlUpdateEmailStatus = 'UPDATE listSampleState SET [email_sent] = 2 WHERE [sample_id] = @sample_id';
    const request = pool.request().input('sample_id', sample_id);
    await request.query(sqlUpdateEmailStatus);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function organizarDatos() {
  const dataOrganizada = await getDataSampleStatus();
  //console.log(dataOrganizada)
  return dataOrganizada
}

async function enviarCorreoAccepted(dataOrganizada) {
  try {
    //console.log(dataOrganizada)
    const sample_id_NewPending = dataOrganizada.filter(sample_id => sample_id.email_sent === '1' && sample_id.customer_sample_feedback === 'Accepted');
    //console.log(sample_id_NewPending);
    if (sample_id_NewPending.length > 0) {
      for (const sample_id of sample_id_NewPending) {
        const mailOptions = {
          from: 'soporte@caravela.coffee',
          to: [],
          bcc: ['juan.diaz@caravela.coffee'/* , sample_id.caravela_mail */ ],
          subject: `The Sample: ${sample_id.sample_id} has been accepted`,
          text: `The following Sample has change the state: 

          Sample id: ${sample_id.sample_id}
          State: ${sample_id.customer_sample_feedback}
          Customer: ${sample_id.customer}
          Marks: ${sample_id.mark}
          `,

        };
        await updateEmailStatus(sample_id.sample_id);
        console.log('estado actualizado', sample_id.email_sent)
        await transporter.sendMail(mailOptions);
        console.log(pc.white(`[SAMPLE STATE]: Correo enviado ${sample_id.sample_id}`));
      }
    } else { console.log(pc.white('[SAMPLE STATE]: No hay correos con estado "accepted" por enviar')); }
  } catch (error) {
    console.error('Error al enviar correos electrónicos:', error);
    throw error;
  }
}

async function enviarCorreoRejected(dataOrganizada) {
  try {
    const sample_id_CancelledPending = dataOrganizada.filter(sample_id => sample_id.email_sent === '1' && sample_id.estado === 'Rejected');
    //console.log(sample_id_NewPending);
    if (sample_id_CancelledPending.length > 0) {
      for (const sample_id of sample_id_CancelledPending) {
        const mailOptions = {
          from: 'soporte@caravela.coffee',
          to: [],
          bcc: ['juan.diaz@caravela.coffee'/* , sample_id.caravela_mail */],
          subject: `The sample: ${sample_id.sample_id} has been rejected`,
          text: `The following Sample has change the state: 

          Sample id: ${sample_id.sample_id}
          State: ${sample_id.customer_sample_feedback}
          Customer: ${sample_id.customer}
          Marks: ${sample_id.mark}
          `,

        };
        await updateEmailStatus(sample_id.sample_id);
        await transporter.sendMail(mailOptions);
        console.log(pc.white(`[SAMPLE STATE]: Correo enviado ${sample_id.sample_id}`));
      }

    } else { console.log(pc.white('[SAMPLE STATE]: No hay correos con estado "Rejected" por enviar')); }
  } catch (error) {
    console.error('Error al enviar correos electrónicos:', error);
    throw error;
  }
}





export async function startSampleStateAutomatization() {
  const dataOrganizada = await organizarDatos();
  await enviarCorreoAccepted(dataOrganizada);
  await enviarCorreoRejected(dataOrganizada);
}


startSampleStateAutomatization()