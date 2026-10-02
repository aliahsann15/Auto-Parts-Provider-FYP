import { RequestHandler } from 'express';
import CarModel from '../models/CarModel';

export const listMakes: RequestHandler = async (req, res) => {
  const search = (req.query.search as string)?.toLowerCase();
  const match = search ? { make: { $regex: search, $options: 'i' } } : {};
  const makes = await CarModel.distinct('make', match);
  res.json({ ok: true, makes: makes.sort() });
};

export const listYears: RequestHandler = async (req, res) => {
  const { make } = req.query;
  if (!make) {
    res.status(400).json({ ok: false, msg: 'make is required' });
    return;
  }
  const match: any = { make };
  const years = await CarModel.distinct('year', match);
  res.json({ ok: true, years: (years as number[]).sort((a, b) => b - a) });
};

export const listModels: RequestHandler = async (req, res) => {
  const { make, year } = req.query;
  if (!make) {
    res.status(400).json({ ok: false, msg: 'make is required' });
    return;
  }
  const match: any = { make };
  if (year) match.year = Number(year);
  const models = await CarModel.find(match).select('modelName year variants -_id').sort({ modelName: 1 }).lean();
  res.json({ ok: true, models });
};
