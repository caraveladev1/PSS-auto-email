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
async function getDataSC() {
  try {
    const pool = await connectDB();
    const sqlDataSC = 'SELECT * FROM listSC';
    const result = await pool.request().query(sqlDataSC);
    return result.recordset;
  } catch (error) {
    console.error('Error:', error);
  }
}

//Funcion para actualizar estado de email
async function updateEmailStatus(contract) {
  try {
    const pool = await connectDB();
    const sqlUpdateEmailStatus = 'UPDATE listSC SET [mail_sent] = 2 WHERE [contract] = @contract';
    const request = pool.request().input('contract', contract);
    await request.query(sqlUpdateEmailStatus);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function organizarDatos() {
  const dataOrganizada = await getDataSC();
  //console.log(dataOrganizada)
  return dataOrganizada
}

async function enviarCorreoNew(dataOrganizada) {
  try {
    const contractsNewPending = dataOrganizada.filter(contract => contract.mail_sent === '1' && contract.estado === 'new');
    //console.log(contractsNewPending);
    if (contractsNewPending.length > 0) {
      for (const contract of contractsNewPending) {
        const mailOptions = {
          from: 'soporte@caravela.coffee',
          to: [],
          bcc: ['juan.diaz@caravela.coffee', contract.caravela_mail ],
          subject: `Creation Spot Contract ${contract.contract}`,
          text: `The following SPOT contract has been created: 

          Contract: ${contract.contract}
          Created Date: ${contract.created_at}
          Delivery Date: ${contract.delivery_date}
          Customer: ${contract.customer}
          Quality: ${contract.quality}
          Marks: ${contract.mark}
          Ico: ${contract.ico}  
          `,

        };
        await updateEmailStatus(contract.contract);
        console.log('estado actualizado', contract.mail_sent)
        await transporter.sendMail(mailOptions);
        console.log(pc.green(`[SPOT CONTRACT]: Correo enviado ${contract.contract}`));
      }
    } else { console.log(pc.green('[SPOT CONTRACT]: No hay correos con estado "nuevo" por enviar')); }
  } catch (error) {
    console.error('Error al enviar correos electrónicos:', error);
    throw error;
  }
}

async function enviarCorreoCancelled(dataOrganizada) {
  try {
    const contractsCancelledPending = dataOrganizada.filter(contract => contract.mail_sent === '1' && contract.estado === 'cancelled');
    //console.log(contractsNewPending);
    if (contractsCancelledPending.length > 0) {
      for (const contract of contractsCancelledPending) {
        const mailOptions = {
          from: 'soporte@caravela.coffee',
          to: [],
          bcc: ['juan.diaz@caravela.coffee'/* , contract.caravela_mail */],
          subject: `Cancellation Spot Contract ${contract.contract}`,
          text: `The following SPOT contract has been cancelled: 

          Contract: ${contract.contract}
          Created Date: ${contract.created_at}
          Delivery Date: ${contract.delivery_date}
          Customer: ${contract.customer}
          Quality: ${contract.quality}
          Marks: ${contract.mark}
          Ico: ${contract.ico}  
          `,

        };
        await updateEmailStatus(contract.contract);
        await transporter.sendMail(mailOptions);
        console.log(pc.green(`[SPOT CONTRACT]: Correo enviado ${contract.contract}`));
      }

    } else { console.log(pc.green('[SPOT CONTRACT]: No hay correos con estado "cancelados" por enviar')); }
  } catch (error) {
    console.error('Error al enviar correos electrónicos:', error);
    throw error;
  }
}

export async function startSCAutomatization() {
  const dataOrganizada = await organizarDatos();
  await enviarCorreoNew(dataOrganizada);
  await enviarCorreoCancelled(dataOrganizada);
}


startSCAutomatization()