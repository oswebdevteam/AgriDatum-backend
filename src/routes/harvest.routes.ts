import { Router } from 'express';
import { harvestController } from '../controllers/harvest.controller.js';
import { validateHarvestSubmission } from '../middleware/validation.middleware.js';

const router: Router = Router();

router.post('/submit', validateHarvestSubmission, harvestController.submitHarvest);

router.post('/verify', harvestController.verifyHarvest);

router.get('/records/:farmerId', harvestController.getRecordsByFarmer);

router.get('/records', harvestController.getAllRecords);

export { router as harvestRoutes };