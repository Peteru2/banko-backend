const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db.js');
const Controller = require('./controller/verifyController.js');
const userController = require('./controller/userController.js');
const transHistoryController = require('./controller/transHistoryController.js');
const authMiddleware = require('./auth.js');
const {upload, uploadImage} = require('./controller/verifyController.js');

const app = express();

app.use(
  cors({
    origin: [
      "https://bankoo.netlify.app",
      "http://localhost:5173"

    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,    
  })
);


app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectDB();

app.post('/signUp', Controller.postSignUp);
app.post('/login', Controller.postLogin);
app.post('/verifyEmail', Controller.verifyEmail);

app.use(authMiddleware);

app.get('/user', userController.getUser);
app.put('/updateTransactionPin', Controller.updateTransactionPin);
app.put('/updatekyc', Controller.updateKyc);
app.get('/balance', Controller.getBalance);
app.post('/val_transfer', Controller.validateTransfer);
app.post('/transfer', Controller.transfer);
app.get('/trans-history', transHistoryController.transferHistory);
app.use("/uploads", express.static("uploads"));
app.post("/upload", upload.single("image"), uploadImage);

app.get('/', (req, res) => {
  res.json({ message: "We are live" });
});

module.exports = app;
