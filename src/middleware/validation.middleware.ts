import type { Request, Response, NextFunction } from 'express';

export const validateHarvestSubmission = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    farmerId,
    phoneNumber,
    plotLocation,
    cropType,
    weightKg,
    timestamp,
    publicKey,
  } = req.body;

  const errors: string[] = [];

  // Validate data inputed by user
  if (!farmerId || typeof farmerId !== 'string' || farmerId.trim().length === 0) {
    errors.push('farmerId is required and must be a non-empty string');
  }

  
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    errors.push('phoneNumber is required');
  } else if (!/^\+?[\d\s\-()]+$/.test(phoneNumber)) {
    errors.push('phoneNumber format is invalid');
  }

  
  if (!plotLocation || typeof plotLocation !== 'string' || plotLocation.trim().length === 0) {
    errors.push('plotLocation is required and must be a non-empty string');
  }

  
  if (!cropType || typeof cropType !== 'string' || cropType.trim().length === 0) {
    errors.push('cropType is required and must be a non-empty string');
  }

  
  const weight = parseFloat(weightKg);
  if (isNaN(weight) || weight <= 0) {
    errors.push('weightKg must be a positive number');
  }

  
  if (!timestamp) {
    errors.push('timestamp is required');
  } else {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp must be a valid ISO 8601 date string');
    }
  }

  
  if (!publicKey || typeof publicKey !== 'string') {
    errors.push('publicKey is required');
  } else if (!/^[0-9a-fA-F]{64,}$/.test(publicKey)) {
    errors.push('publicKey must be a valid hexadecimal string (minimum 64 characters)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
};