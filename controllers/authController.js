const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Registrazione nuovo utente
const registerUser = async (req, res) => {
  const { email, password, full_name } = req.body;

  try {
    // Controllo se l'utente esiste già
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email già registrata.' });
    }

    // Hash della password prima di salvarla (MAI in chiaro)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Salvataggio nel database
    const newUser = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, role',
      [email, passwordHash, full_name]
    );

    res.status(201).json({ message: 'Registrazione completata con successo.', user: newUser.rows[0] });
  } catch (error) {
    console.error('Errore registrazione:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
};

// Login utente
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Cerco l'utente
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Credenziali non valide.' });
    }

    const user = userResult.rows[0];

    // Confronto la password inserita con l'hash nel database
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenziali non valide.' });
    }

    // Genero il token JWT per l'autenticazione sicura (scade in base al .env)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Login effettuato.',
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
};

module.exports = { registerUser, loginUser };
