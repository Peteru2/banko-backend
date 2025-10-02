const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db.js');
const Controller = require('./controller/verifyController.js');
const userController = require('./controller/userController.js');
const transHistoryController = require('./controller/transHistoryController.js');
const authMiddleware = require('./auth.js');

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// app.options("*", cors());

// app.use(cors(corsOptions));
// app.options("*", cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

app.post('/SignUp', Controller.Post_signUp);
app.post('/Login', Controller.Post_login);
app.post('/verifyEmail', Controller.verifyEmail);

app.use(authMiddleware);

app.get('/user', userController.Get_user);
app.put('/updateTransactionPin', Controller.UpdateTransPin);
app.put('/updatekyc', Controller.UpdateKyc);
app.get('/balance', Controller.GetBalance);
app.post('/val_transfer', Controller.Check_transfer);
app.post('/transfer', Controller.Post_transfer);
app.get('/trans-history', transHistoryController.Transfer_history);
app.get('/', (req, res) => {
  res.json({ message: "API running on Vercel" });
});

module.exports = app;
