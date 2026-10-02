import { Router } from 'express';
import authenticateToken from '../middleware/auth';
import { getMyStore, upsertMyStore, getStoreById, addStoreManager, listStoreManagers, updateStoreManager, removeStoreManager, getStoreBySellerId } from '../controllers/storeController';

const router = Router();

// Get the authenticated seller's store
router.get('/me', authenticateToken as any, getMyStore as any);
// Update the authenticated seller's store
router.put('/me', authenticateToken as any, upsertMyStore as any);
// List managers of the authenticated seller's store
router.get('/me/managers', authenticateToken as any, listStoreManagers as any);
// Create or attach a Store Manager to the authenticated seller's store
router.post('/me/managers', authenticateToken as any, addStoreManager as any);
// Update an existing manager in the authenticated seller's store
router.put('/me/managers/:id', authenticateToken as any, updateStoreManager as any);
// Remove a manager from the authenticated seller's store
router.delete('/me/managers/:id', authenticateToken as any, removeStoreManager as any);
// Get store by ID (public)
router.get('/:id', getStoreById as any);
// Get store by seller id (public)
router.get('/by-seller/:sellerId', getStoreBySellerId as any);

export default router;
