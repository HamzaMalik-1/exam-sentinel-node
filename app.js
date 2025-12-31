const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

// Import Custom Error Handlers
const { errorHandler } = require('./middlewares/errorHandler');
const { InternalServerError } = require('./utils/ErrorHelpers/Errors');

// Import Routes
const authRouter = require('./routes/authRoutes');
const dropdownRouter = require('./routes/dropdownRoutes');
const classRouter = require('./routes/classRoutes');
// const productRouter = require('./routes/productRoutes'); 
// const subjectRouter = require('./routes/subjectRoutes'); // Uncomment when ready
// const examRouter = require('./routes/examRoutes');       // Uncomment when ready

const app = express();

// --- 1. GLOBAL MIDDLEWARE ---

// Security Headers
app.use(helmet());

// CORS (Cross-Origin Resource Sharing)
app.use(cors());

// Rate Limiting (Apply this early to stop spam/DoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
  message: {
    success: false,
    message: '❌ Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
app.use(limiter);

// Body Parsing
app.use(express.json({ limit: '5mb' })); // Limit JSON size
app.use(express.urlencoded({ extended: true })); // Fix deprecation warning

// Prevent HTTP Parameter Pollution
app.use(hpp());

// --- 2. ROUTES ---

// Test Route
app.get('/', (req, res) => {
  res.status(200).send('✅ Server is working!');
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dropdown', dropdownRouter);
app.use('/api/classes', classRouter);
// app.use('/api/product', productRouter);
// app.use('/api/subjects', subjectRouter); 
// app.use('/api/exams', examRouter);

// --- 3. ERROR HANDLING (Must be last) ---

// 404 Handler (Optional: for unmatched routes)
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;