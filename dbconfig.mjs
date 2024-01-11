// dbConfig.js
import sql from 'mssql'
import dotenv from 'dotenv'
import pc from 'picocolors'
dotenv.config()

async function connectDB() {
  const pool = await new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT),
    options: {
      encrypt: false, // for azure
      trustServerCertificate: true // change to true for local dev / self-signed certs
    }
  })

  try {
    await pool.connect()
    console.log(pc.green('✅ Conexión exitosa a la base de datos ✅'))
    return pool
  } catch (error) {
    console.log(pc.red(`⛔ Error de conexión: ${error} ⛔`), error)
  }
}
export default connectDB