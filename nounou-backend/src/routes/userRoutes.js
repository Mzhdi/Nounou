const express = require('express');
const router = express.Router();

// Middleware
const AuthMiddleware = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

// Controller
const UserController = require('../controllers/userController');

// Routes publiques (sans authentification)
router.post('/register', 
  ValidationMiddleware.validateRegister, 
  UserController.register
);

router.post('/login', 
  ValidationMiddleware.validateLogin, 
  UserController.login
);

router.post('/refresh-token', 
  AuthMiddleware.refreshToken, 
  UserController.refreshToken
);

// Routes protégées (authentification requise)
router.use(AuthMiddleware.authenticate);

// Profil utilisateur
router.get('/profile', UserController.getProfile);
router.put('/profile', 
  ValidationMiddleware.validateUpdateProfile, 
  UserController.updateProfile
);

// Authentification
router.post('/logout', UserController.logout);
router.post('/logout-all', UserController.logoutAllDevices);
router.get('/verify-token', UserController.verifyToken);

// Gestion mot de passe
router.post('/change-password', 
  ValidationMiddleware.validateChangePassword, 
  UserController.changePassword
);

// Gestion sessions
router.get('/sessions', UserController.getSessions);
router.delete('/sessions/:sessionId', 
  ValidationMiddleware.validateUUID('sessionId'),
  UserController.revokeSession
);

// Compte utilisateur
router.delete('/account', UserController.deleteAccount);

// Routes admin (optionnel)
router.get('/stats', 
  // AuthMiddleware.requireAdmin, // À implémenter si besoin
  UserController.getUserStats
);

module.exports = router;