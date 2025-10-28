const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db.js');
const authMiddleware = require('./auth.js');
const Controller = require('./controller/verifyController.js');
const userController = require('./controller/userController.js');
const transHistoryController = require('./controller/transHistoryController.js');
const {upload, uploadImage} = require('./controller/verifyController.js');
const {logoutUser} = require('./controller/logoutController.js');
const  { refreshToken } = require('./controller/refreshTokenController.js');
const  {  googleSignUpController } = require('./controller/googleSignUpController.js');
const {updatePhoneNumber} = require('./controller/updatePhoneNumberController.js');

const app = express();

app.use(
  cors({
    origin: [
      "https://bankoo.netlify.app",
      "http://localhost:5173",
      "https://accounts.google.com",

    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,    
  })
);


app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cookieParser = require("cookie-parser");
app.use(cookieParser());

connectDB();

app.post('/signUp', Controller.postSignUp);
app.post('/login', Controller.postLogin);
app.post('/logout', logoutUser);
app.post('/verifyEmail', Controller.verifyEmail);
app.post('/googleSignUp', googleSignUpController);



app.use(authMiddleware);

app.get('/user', userController.getUser);
app.post('/refresToken', refreshToken); 
app.put('/updateTransactionPin', Controller.updateTransactionPin);
app.put('/updatekyc', Controller.updateKyc);
app.put('/updatePhoneNumber', updatePhoneNumber);

app.get('/balance', Controller.getBalance);
app.post('/validateTransfer', Controller.validateTransfer);
app.post('/transfer', Controller.transfer);
app.get('/transactionHistory', transHistoryController.transferHistory);
app.use("/uploads", express.static("uploads"));
app.post("/upload", upload.single("image"), uploadImage);

app.get('/', (req, res) => {  
  res.json({ message: "We are live" });
});

module.exports = app;
