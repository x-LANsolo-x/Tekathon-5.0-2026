const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();

const participantRoutes = require('./routes/participant');
const evaluatorRoutes = require('./routes/evaluator');
const superadminRoutes = require('./routes/superadmin');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/', limiter);

// Middlewares
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(hpp()); // HTTP Parameter Pollution protection
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serve pdfs statically

// Strict String Validation for Auth Routes
const strictStringValidation = (req, res, next) => {
  const sensitiveFields = ['email', 'password', 'otp', 'currentPassword', 'newPassword'];
  for (const field of sensitiveFields) {
    if (req.body && req.body[field] !== undefined) {
      if (typeof req.body[field] !== 'string') {
        return res.status(400).json({ error: 'Invalid input format. Expected string.' });
      }
    }
  }
  next();
};
app.use(strictStringValidation);

// Export Auth Limiter for Routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // strictly 5 attempts
  message: { error: 'Maximum authentication attempts exceeded. Try again in 15 minutes.' },
  skip: (req) => req.method === 'OPTIONS'
});

// Apply authLimiter to sensitive endpoints
app.use('/api/participant/login', authLimiter);
app.use('/api/participant/signup', authLimiter);
app.use('/api/participant/verify-otp', authLimiter);
app.use('/api/evaluator/login', authLimiter);
app.use('/api/evaluator/verify-otp', authLimiter);
app.use('/api/superadmin/login', authLimiter);

// Session setup for evaluators and superadmin
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key-tekathon5',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 3600000, // 1 hour
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' 
  } 
}));

// Routes
app.use('/api/participant', participantRoutes);
app.use('/api/evaluator', evaluatorRoutes);
app.use('/api/superadmin', superadminRoutes);

// Server Connection (Database is Google Sheets now)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log('Database Mode: Supabase PostgreSQL (Ensure .env is configured)');
});
