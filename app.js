const express = require('express');
const http = require('http');
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
  // "https://your-frontend.vercel.app" 
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB()
// .then(() => {
//   server.listen(process.env.PORT, "0.0.0.0", () => {
//     console.log('Server is running on port 8000');
//   });
// });

app.post('/SignUp', Controller.Post_signUp);
app.post('/Login', Controller.Post_login);
app.post('/verifyEmail', Controller.verifyEmail);

app.all('*', authMiddleware)

app.get('/', authMiddleware, userController.Get_user);
app.put('/updateTransactionPin', authMiddleware, Controller.UpdateTransPin);
app.put('/updatekyc', authMiddleware, Controller.UpdateKyc);
app.get('/balance', authMiddleware, Controller.GetBalance);
app.post('/val_transfer', authMiddleware, Controller.Check_transfer);
app.post('/transfer', authMiddleware, Controller.Post_transfer);
app.get('/trans-history', authMiddleware, transHistoryController.Transfer_history);
