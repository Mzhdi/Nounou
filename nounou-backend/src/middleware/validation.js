const ApiResponse = require('../utils/responses');
const Validators = require('../utils/validators');

class ValidationMiddleware {
  static validateRegister(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.registerSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateLogin(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.loginSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateUpdateProfile(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.updateProfileSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateChangePassword(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.changePasswordSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateGoal(req, res, next) {
    const { isValid, errors, data } = Validators.validate(Validators.goalSchema, req.body);
    
    if (!isValid) {
      return ApiResponse.validationError(res, errors);
    }
    
    req.validatedData = data;
    next();
  }

  static validateUUID(paramName) {
    return (req, res, next) => {
      const value = req.params[paramName];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(value)) {
        return ApiResponse.error(res, `Invalid ${paramName} format`, 400);
      }
      
      next();
    };
  }
}

module.exports = ValidationMiddleware;