const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const validate = require('../middlewares/validationMiddleware');
const { registerValidation, loginValidation } = require('../validators/authValidator');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');
const asyncHandler = require('../middlewares/asyncHandler');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

router.post(
  '/register',
  validate(registerValidation),
  asyncHandler(async (req, res) => {
    try {
      const { name, email, password, userType, campIds = [], role = [] } = req.body;

      let user = await User.findOne({ email });
      if (user) {
        return sendErrorResponse(res, 'User already exists', 400);
      }

      const body = {
        name,
        email,
        // password,
        userType,
        role: [],
        campIds
      }

      if (userType !== 'client' && password) {
        body.password = password;
      }

      if (userType === 'staff') {
        body.role = role
      }

      user = new User(body);
      await user.save();

      const payload = { userId: user._id, userType: user.userType };
      const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

      // for add token vendor
      const vendor_token = jwt.sign({ campId: campIds[0], userId: user._id || user?.id }, process.env.JWT_SECRET_KEY, {});
      await User.findByIdAndUpdate(user?.id || user?._id, { vendor_api_token: vendor_token }, {new: true})

      return sendSuccessResponse(res, { token, user }, 'User registered successfully', 201);
    } catch (error) {
      return sendErrorResponse(res, error?.message || 'Something went wrong', 400)
    }
  })
);

router.post(
  '/login',
  validate(loginValidation),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendErrorResponse(res, 'Invalid credentials', 400);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendErrorResponse(res, 'Invalid credentials', 400);
    }

    const payload = { userId: user._id, userType: user.userType };

    if (user.userType === 'staff') {
      payload.role = user.role
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });

    return sendSuccessResponse(res, { accessToken: token }, 'You are successfully logged in', 201);
  })
);

router.get(
  '/users',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', userType, role = '' } = req.query;
    const limitNum = parseInt(limit, 10);
    const pageNum = Math.max(1, parseInt(page, 10));
    const skip = (pageNum - 1) * limitNum;

    const currentUserType = req.user.userType;
    const currentUserId = req.user.id;

    let searchQuery = { isActive: true };

    if (userType) {
      searchQuery.userType = userType;
    }

    if (currentUserType === 'subAdmin') {
      const currentUser = await User.findById(currentUserId).select('AssignedVendorIds');
      if (currentUser && currentUser.AssignedVendorIds.length > 0) {
        searchQuery._id = { $in: currentUser.AssignedVendorIds };
      } else {
        return sendSuccessResponse(
          res,
          {
            totalUsers: 0,
            totalPages: 0,
            currentPage: pageNum,
            users: [],
          },
          'No users assigned to this subAdmin',
          200
        );
      }
    }

    // Apply search filter
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Apply role filter
    if (role) {
      const rolesArray = role.split(',').map((r) => r.trim());
      searchQuery.role = { $in: rolesArray };
    }

    // Fetch total count and users
    const totalUsers = await User.countDocuments(searchQuery);

    const users = await User.find(searchQuery)
      .select('-password')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    // Prepare response
    const response = {
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
      users,
    };

    return sendSuccessResponse(res, response, 'Users fetched successfully', 200);
  })
);

// Update
router.put(
  '/user/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, password, userType, role = [], campIds = [], clientIds = [], vendorIds = [] } = req.body;

    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        return sendErrorResponse(res, 'Email already exists', 400);
      }
    }

    const updateData = { name, email, userType, role, campIds };

    if (userType === "subAdmin") {
      updateData.AssignedClientsIds = clientIds
      updateData.AssignedVendorIds = vendorIds
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }); // { new: true } returns the updated document

    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    return sendSuccessResponse(res, { user }, 'User updated successfully', 200);
  })
);

// Delete
router.delete(
  '/user/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    let user = await User.findById(id);
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    user.isActive = false;
    await user.save();

    return sendSuccessResponse(res, {}, 'User deleted successfully', 200);
  })
);

router.get('/verifyToken', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendErrorResponse(res, 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
        return sendErrorResponse(res, 'Token is not valid', 401);
      }

      return sendSuccessResponse(res, { isValid: decoded.userId ? true : false }, 'Token is valid', 200);
    });
  } catch (error) {
    return sendErrorResponse(res, 'An error occurred during token verification', 500);
  }
});
module.exports = router;
