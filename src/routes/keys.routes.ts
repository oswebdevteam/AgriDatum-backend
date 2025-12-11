import { Router } from 'express';
import { keysController } from '../controllers/keys.controller.js';

const router: Router = Router();

 
router.post('/generate', keysController.generateKeys);

export { router as keysRoutes };