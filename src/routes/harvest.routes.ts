// src/routes/harvest.routes.ts
import { Router } from 'express';
import { harvestController } from '../controllers/harvest.controller.js';
import { validateHarvestSubmission } from '../middleware/validation.middleware.js';

const router: Router = Router();

/**
 * POST /api/harvest/submit
 * Submit new harvest record with blockchain integration
 */
router.post('/submit', validateHarvestSubmission, harvestController.submitHarvest);

/**
 * POST /api/harvest/verify
 * Verify harvest record signature and blockchain status
 */
router.post('/verify', harvestController.verifyHarvest);

/**
 * GET /api/harvest/records/:farmerId
 * Get all harvest records for a specific farmer
 */
router.get('/records/:farmerId', harvestController.getRecordsByFarmer);

/**
 * GET /api/harvest/records
 * Get all harvest records with optional filters
 */
router.get('/records', harvestController.getAllRecords);

export { router as harvestRoutes };