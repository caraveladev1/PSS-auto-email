import express from "express";
import mailchimpTx from "@mailchimp/mailchimp_transactional";
const apiKey = "md-wIMZriLotN3a88eDDIn-lw";
//const apiKey = "3247583d422fdb8bfdca3cd7ce5590f5-us11";
const mailchimp = mailchimpTx(apiKey);

const app = express()
app.disable('x-powered-by')
app.use(express.json())



async function run() {
  const response = await mailchimp.users.ping();
  console.log(response);
}

run();


const message = {
  from_email: "juan.diaz@caravela.coffee",
  subject: "Hello world",
  text: "Welcome to Mailchimp Transactional!",
  to: [
    {
      email: "juan.diaz@caravela.coffee",
      type: "to"
    }
  ]
};

async function runMail() {
  const response = await mailchimp.messages.send({
    message
  });
  console.log(response);
}
runMail();
