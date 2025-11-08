const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./db.js');
const authMiddleware = require('./auth.js');
const Controller = require('./controller/verifyController.js');
const userController = require('./controller/userController.js');
const transHistoryController = require('./controller/transHistoryController.js');
const { upload, uploadImage } = require('./controller/verifyController.js');
const { logoutUser } = require('./controller/logoutController.js');
const { refreshToken } = require('./controller/refreshTokenController.js');
const { googleSignUpController } = require('./controller/googleSignUpController.js');
const { updatePhoneNumber } = require('./controller/updatePhoneNumberController.js');
const { allUsersController } = require('./controller/allUsersController.js');
const { deleteUserController } = require('./controller/deleteUserController.js');
const {airtimePurchase} = require("./controller/airtimeController.js")
const cookieParser = require("cookie-parser");

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
app.use(cookieParser());

connectDB();


const apiRouter = express.Router();


apiRouter.post('/signUp', Controller.postSignUp);
apiRouter.post('/login', Controller.postLogin);
apiRouter.post('/logout', logoutUser);
apiRouter.post('/verifyEmail', Controller.verifyEmail);
apiRouter.post('/googleSignUp', googleSignUpController);
apiRouter.post('/refreshToken', refreshToken);


apiRouter.use(authMiddleware);

apiRouter.get('/user', userController.getUser);
apiRouter.get('/admin/users', allUsersController);
apiRouter.delete('/admin/users/:id', deleteUserController);
apiRouter.put('/updateTransactionPin', Controller.updateTransactionPin);
apiRouter.put('/updateKyc', Controller.updateKyc);
apiRouter.put('/updatePhoneNumber', updatePhoneNumber);
apiRouter.get('/balance', Controller.getBalance);
apiRouter.post('/validateTransfer', Controller.validateTransfer);
apiRouter.post('/transfer', Controller.transfer);
apiRouter.get('/transactionHistory', transHistoryController.transferHistory);
apiRouter.post("/transactions/airtime", airtimePurchase)


apiRouter.use("/uploads", express.static("uploads"));
apiRouter.post("/upload", upload.single("image"), uploadImage);



app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.json({ message: "We are live" });
});

module.exports = app;
