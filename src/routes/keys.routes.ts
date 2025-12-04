import { Router } from 'express';
import { keysController } from '../controllers/keys.controller.js';

const router: Router = Router();

//Generate public key and address from seed input
 
router.post('/generate', keysController.generateKeys);

export { router as keysRoutes };