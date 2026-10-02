import express from "express";
import asyncHandler from "express-async-handler";
import {
  getUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  listBankAccounts,
  addBankAccount,
  removeBankAccount,
  // add new controller imports
} from "../controllers/userController";
import authenticateToken from "../middleware/auth";

const router = express.Router();

// Protect all routes below
router.use(authenticateToken as express.RequestHandler);

router.get(
  "/:id/bank-accounts",
  asyncHandler(async (req, res) => {
    await listBankAccounts(req as any, res);
  })
);

router.post(
  "/:id/bank-accounts",
  asyncHandler(async (req, res) => {
    await addBankAccount(req as any, res);
  })
);

router.delete(
  "/:id/bank-accounts/:accountId",
  asyncHandler(async (req, res) => {
    await removeBankAccount(req as any, res);
  })
);

// Wrap controller calls so types align with asyncHandler (preserves original controller behavior)
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    await getUser(req, res);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    await updateUser(req, res);
  })
);

// add card
router.post(
  "/:id/cards",
  asyncHandler(async (req, res) => {
    // lazy import to avoid circular issues if any
    const { addCard } = await import("../controllers/userController");
    await addCard(req, res);
  })
);

// remove card
router.delete(
  "/:id/cards/:cardId",
  asyncHandler(async (req, res) => {
    const { removeCard } = await import("../controllers/userController");
    await removeCard(req, res);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await deleteUser(req, res);
  })
);

router.post(
  "/:id/change-password",
  asyncHandler(async (req, res) => {
    await changeUserPassword(req, res);
  })
);

export default router;
