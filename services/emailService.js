const nodemailer = require('nodemailer');

// Configurazione trasportatore (legge dal .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true per 465, false per le altre porte
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Funzione generica per invio email
const sendRealEmail = async (to, subject, htmlContent) => {
  try {
    const info = await transporter.sendMail({
      from: `"Meet & Play" <${process.env.EMAIL_FROM}>`,
      to: to,
      subject: subject,
      html: htmlContent,
    });
    console.log(`Email inviata correttamente a ${to}: ${info.messageId}`);
  } catch (error) {
    console.error(`Errore durante l'invio dell'email a ${to}:`, error);
  }
};

// Modelli di Email (Templates)

const sendBookingConfirmation = (userEmail, userName, eventTitle, eventDate) => {
  const html = `
    <h2>Ciao ${userName}, la tua prenotazione è confermata!</h2>
    <p>Ti confermiamo la tua partecipazione all'evento <strong>${eventTitle}</strong> del ${eventDate}.</p>
    <p>Puoi visualizzare i dettagli accedendo al tuo account Meet & Play.</p>
    <p>A presto,<br>Il team di Materia Creativa</p>
  `;
  return sendRealEmail(userEmail, 'Conferma Prenotazione - Meet & Play', html);
};

const sendPaymentFailed = (userEmail, userName) => {
  const html = `
    <h2>Attenzione ${userName}, problema col pagamento.</h2>
    <p>Il pagamento per la tua ultima prenotazione non è andato a buon fine. La prenotazione risulta annullata.</p>
    <p>Ti invitiamo a riprovare.</p>
  `;
  return sendRealEmail(userEmail, 'Pagamento Fallito - Meet & Play', html);
};

module.exports = { sendRealEmail, sendBookingConfirmation, sendPaymentFailed };
