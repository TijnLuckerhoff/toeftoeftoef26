import express from 'express';
import {
  getAllergens,
  getProductByBarcode,
  getPrototypeInfo,
  getProfile,
  saveProfile,
  scanText
} from '../controllers/allergiesController.js';
const router = express.Router();

router.get('/', getPrototypeInfo);
router.get('/api/allergens', getAllergens);
router.get('/api/profile', getProfile);
router.get('/api/products/:barcode', getProductByBarcode);
router.put('/api/profile', saveProfile);
router.post('/api/scan-text', scanText);

export default router;
