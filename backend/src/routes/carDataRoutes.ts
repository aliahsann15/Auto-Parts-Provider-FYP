import express from 'express';
import asyncHandler from 'express-async-handler';
import { listMakes, listYears, listModels } from '../controllers/carDataController';

const router = express.Router();

router.get(
  '/makes',
  asyncHandler(async (req, res, next) => {
    await listMakes(req, res, next);
  })
);

router.get(
  '/years',
  asyncHandler(async (req, res, next) => {
    await listYears(req, res, next);
  })
);

router.get(
  '/models',
  asyncHandler(async (req, res, next) => {
    await listModels(req, res, next);
  })
);

export default router;
