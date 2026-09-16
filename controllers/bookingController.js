const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const createBooking = async (req, res) => {
  const { event_id, participants_count } = req.body;
  const user_id = req.user.id; // Viene dal middleware protectRoute

  // Inizializziamo una transazione DB per bloccare concorrenze (overbooking)
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Inizio transazione

    // 1. Controllo disponibilità lato server (Atomico)
    // Leggiamo l'evento e sommiamo le prenotazioni attive
    const eventQuery = await client.query('SELECT capacity, price, is_paid FROM events WHERE id = $1', [event_id]);
    if (eventQuery.rows.length === 0) throw new Error('Evento non trovato.');
    
    const eventInfo = eventQuery.rows[0];

    const bookingsQuery = await client.query(
      "SELECT SUM(participants_count) as total_booked FROM bookings WHERE event_id = $1 AND payment_status != 'cancelled' AND payment_status != 'failed'",
      [event_id]
    );
    const totalBooked = parseInt(bookingsQuery.rows[0].total_booked || 0);

    // 2. Prevenzione Overbooking Server-Side
    if (totalBooked + participants_count > eventInfo.capacity) {
      throw new Error('Capienza superata. Non ci sono abbastanza posti disponibili.');
    }

    // 3. Calcolo del totale dal server (ignoro qualsiasi prezzo inviato dal frontend)
    const totalAmount = eventInfo.price * participants_count;
    let paymentIntentId = null;

    // 4. Creazione sessione di pagamento Stripe se l'evento è a pagamento
    if (eventInfo.is_paid && totalAmount > 0) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Stripe usa i centesimi
        currency: 'eur',
        metadata: { event_id, user_id, participants_count },
      });
      paymentIntentId = paymentIntent.id;
    }

    // 5. Creazione della prenotazione in stato 'pending'
    const newBooking = await client.query(
      `INSERT INTO bookings (user_id, event_id, participants_count, total_amount, payment_status, stripe_payment_intent_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user_id, event_id, participants_count, totalAmount, eventInfo.is_paid ? 'pending' : 'paid', paymentIntentId]
    );

    await client.query('COMMIT'); // Conferma transazione nel DB
    
    // Ritorno l'ID del pagamento al frontend (Client Secret) per completare l'UI di Stripe
    res.status(201).json({ 
      message: 'Prenotazione creata.', 
      booking_id: newBooking.rows[0].id,
      clientSecret: paymentIntentId ? paymentIntent.client_secret : null 
    });

  } catch (error) {
    await client.query('ROLLBACK'); // In caso di errore, annullo tutto per non lasciare dati a metà
    console.error('Errore creazione prenotazione:', error.message);
    res.status(400).json({ message: error.message });
  } finally {
    client.release(); // Libero la connessione DB
  }
};

module.exports = { createBooking };
