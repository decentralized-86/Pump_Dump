const jwt = require("jsonwebtoken");
const Constant = require("../models/Constants");
require('dotenv').config();
const Constants = require("../models/Constants");
const PumpUser = require("../models/PumpUser");

const generateJwtToken = ({
  tgId,
  userId,
  inviteLink,
  inviterId,
  avatar,
  name,
}) => {
  const payload = {
    tgId,
    userId,
    inviteLink,
    inviterId,
    avatar,
    name,
    iss: "https://api.telegram.org",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // Token valid for 1 year
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256" });
};

const generateAdminJWTToken = async(
  tgId,
  password) => {
  try{
    const constant = await Constants.findOne({adminUserName:tgId});
    if(password!=constant.password) return {success: false}
    const token = jwt.sign(
      { userId: constant.adminTgId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    return {
      success: true,
      token
    }
  }catch(err){
    return {success: false}
  }
  
};


const authenticateAdmin = async(req,res,next)=>{
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; 
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, async(err, user) => {
    if (err) {
      return res.status(403).json({ message: "Access Denied: Invalid Token" });
    }
    const constant = await Constants.findOne({adminTgId:user.userId});
    if(!constant) return res
    .status(401)
    .json({ message: "Access Denied: Not an admin" });
    const data = await PumpUser.findOne({tgId: user.userId})
    if(!constant) return res
    .status(401)
    .json({ message: "Access Denied: admin not found" });
    req.user = data; // Attach user information to the request object
    next(); // Proceed to the next middleware or route handler
  });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log(authHeader)
  const token = authHeader && authHeader.split(" ")[1]; // Extract token from 'Bearer token'
  console.log(token, "token")
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Access Denied: Invalid Token" });
    }
    console.log(user)
    req.user = user; // Attach user information to the request object
    next(); // Proceed to the next middleware or route handler
  });
};

module.exports = { generateJwtToken, authenticateToken, authenticateAdmin, generateAdminJWTToken };
