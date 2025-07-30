const jwt = require("jsonwebtoken");
const User = require("../models/User");
// const JWT_SECRET_Key='JWT_SECRET=home_users'
const JWTSECRETKey= process.env.JWT_SECRET;
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      msg: "Bad request. Please add email and password in the request body",
    });
  }

  let foundUser = await User.findOne({ email: req.body.email });
  if (foundUser) {
    const isMatch = await foundUser.comparePassword(password);

    if (isMatch) {
      const token = jwt.sign(
        { id: foundUser._id, name: foundUser.name },
        JWTSECRETKey,
        {
          expiresIn: "30d",
        }
      );

      return res.status(200).json({ msg: "user logged in", token ,});
    } else {
      return res.status(400).json({ msg: "Bad password" });
    }
  } else {
    return res.status(400).json({ msg: "Bad credentails" });
  }
};

const dashboard = async (req, res) => {
  const luckyNumber = Math.floor(Math.random() * 100);

  res.status(200).json({
    msg: `Hello, ${req.user.name}`,
    
  });
};

const getAllUsers = async (req, res) => {
  let users = await User.find({});

  return res.status(200).json({ users });
};

const register = async (req, res) => {
  const { username, email, password, role } = req.body;

  // Check if all required fields are provided
  if (!username || !email || !password) {
    return res.status(400).json({ msg: "Please provide all required fields: username, email, and password." });
  }

  try {
    // Check if user already exists
    const foundUser = await User.findOne({ email: email });
    if (foundUser) {
      return res.status(400).json({ msg: "Email is already in use" });
    }

    // Set default role if not provided
    const userRole = role && ["admin", "manager", "user"].includes(role) ? role : "user";

    // Create a new user
    const user = new User({
      userName: username,
      email: email,
      password: password,
      role: userRole,  
    });

    // Save the new user
    await user.save();

    // Exclude password from the response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Send success response
    return res.status(201).json({ user: userResponse });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Server error, please try again later." });
  }
};



module.exports = {
  login,
  register,
  dashboard,
  getAllUsers,
};
