import express from 'express';
import { getAllPets, updatePet, getPet } from '../controllers/petsController.js';
import cors from 'cors';
const router = express.Router();

// routes
router.get('/', cors(), (req, res, next) => {
  res.json('hi');
});
router.get('/pets', cors(), getAllPets);
router.get('/pets/:id', cors(), getPet);

export default router;
