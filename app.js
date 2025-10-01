const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db.js');
const Controller = require('./controller/verifyController.js');
const userController = require('./controller/userController.js');
const transHistoryController = require('./controller/transHistoryController.js');
const authMiddleware = require('./auth.js');

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
    process.env.CLIENT_URL
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS blocked this origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


connectDB();


app.post('/SignUp', Controller.Post_signUp);
app.post('/Login', Controller.Post_login);
app.post('/verifyEmail', Controller.verifyEmail);

app.use(authMiddleware);

// app.get('/', (req, res) => {
//   res.json({ message: "API running on Vercel 🚀" });
// });

app.get('/user', userController.Get_user);
app.put('/updateTransactionPin', Controller.UpdateTransPin);
app.put('/updatekyc', Controller.UpdateKyc);
app.get('/balance', Controller.GetBalance);
app.post('/val_transfer', Controller.Check_transfer);
app.post('/transfer', Controller.Post_transfer);
app.get('/trans-history', transHistoryController.Transfer_history);


module.exports = app;
