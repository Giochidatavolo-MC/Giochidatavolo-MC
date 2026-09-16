const jwt = require('jsonwebtoken');

// Verifica che l'utente sia loggato
const protectRoute = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Non autorizzato, nessun token fornito.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Salvo i dati dell'utente nella richiesta
    next();
  } catch (error) {
    res.status(401).json({ message: 'Non autorizzato, token non valido.' });
  }
};

// Verifica che l'utente sia Amministratore
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Accesso negato: richiesti privilegi di amministratore.' });
  }
};

module.exports = { protectRoute, adminOnly };
