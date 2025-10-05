// const dotenv = require('dotenv');
// dotenv.config();
// const nodemailer = require('nodemailer');
const axios = require('axios');
// import axios from "axios"

const convertPhoneToISO = (number, countryCode = "234") => {
  if (!number) return "";
  const cleaned = number.replace(/[^0-9+]/g, "");
  const normalized = cleaned.replace(/^\++/, "+");
  if (normalized.startsWith(`+${countryCode}`)) {
    return normalized;
  }
  if (normalized.startsWith(countryCode)) {
    return `+${normalized}`;
  }
  if (normalized.startsWith("0")) {
    return `+${countryCode}${normalized.slice(1)}`;
  }
  if (/^\d+$/.test(normalized)) {
    return `+${countryCode}${normalized}`;
  }
  return null;
};


  function generateAccountNumber() {
    let accountNumber = '';
    const digits = '0123456789';

    for (let i = 0; i < 10; i++) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        accountNumber += digits[randomIndex];
    }

    return accountNumber;
}

function generateEmailVerificationCode(length = 6) {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

// async function transporter(user, emailVerificationCode) {
//   try {
//     const mailtransporter = nodemailer.createTransport({
//       host: "smtp.gmail.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS, 
//       },
//       tls: {
//         rejectUnauthorized: false,
//       },
//     });

//     await mailtransporter.verify();
//     await mailtransporter.sendMail({
//       from: `"Banko" <${process.env.EMAIL_USER}>`,
//       to: user.email,
//       subject: "Your Verification Code",
//       text: `Your verification code is ${emailVerificationCode}. It will expire in 10 minutes.`,
//     });
//     console.log("Email sent successfully")
//   } catch (error) {
//     console.error("Error:", error);
//   }
// }


// async function transporter(user, emailVerificationCode) {
//   try {
//     await axios.post("https://api.brevo.com/v3/smtp/email", {
//       sender: { name: "Banko", email: "no-reply@bankoapp.com" },
//           to: [{ email: user.email }],
//       subject: "Your Verification Code",
//       textContent: `Your verification code is ${emailVerificationCode}. It expires in 10 minutes.`,
//     }, {
//       headers: {
//         "api-key": process.env.BREVO_API_KEY,
//         "Content-Type": "application/json",
//       },
//     });

//     console.log("Email sent successfully via Brevo");
//   } catch (error) {
//     console.error("Email error:", error.response?.data || error.message);
//   }
// }


  module.exports = {
    convertPhoneToISO,
    generateAccountNumber,
    generateEmailVerificationCode,
    // transporter
  }