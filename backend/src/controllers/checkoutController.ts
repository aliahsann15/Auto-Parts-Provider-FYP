// controllers/checkoutController.ts

import { RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';
import Cart from '../models/Cart';
import Order, { IOrderItem } from '../models/Order';
import User from '../models/User';

// Create a new checkout/order from the user's cart and billing info
export const createCheckout: RequestHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1️⃣ Ensure user is authenticated
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    // 2️⃣ Fetch the user's cart
    const cart = await Cart.findOne({ user: userId }).lean();
    if (!cart || cart.items.length === 0) {
      res.status(400).json({ message: 'Your cart is empty.' });
      return;
    }

    // 3️⃣ Extract billing & payment details from request body
    const {
      firstName, lastName, email, phone,
      country, state, city, address, postalCode,
      paymentMethod
    } = req.body as Record<string, any>;

    // TODO: Add validation for required fields

    // 4️⃣ Transform cart items into order items
    const orderItems: IOrderItem[] = cart.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      price: item.product.salePrice ?? item.product.price
    }));

    // 5️⃣ Calculate total amount
    const totalAmount = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

    // 6️⃣ Build shipping address object
    const shippingAddress = {
      street:  address,
      city, state, country, zipCode: postalCode
    };

    // 7️⃣ Create the order document
    const newOrder = await Order.create({
      seller:       null,             // optionally assign a seller
      customer:     userId,
      items:        orderItems,
      totalAmount,
      status:       'pending',
      shippingAddress,
      paymentStatus: paymentMethod === 'Cash on Delivery' ? 'pending' : 'completed',
      paymentMethod,
      trackingNumber: null
    });

    // 8️⃣ Clear the user's cart
    await Cart.updateOne({ user: userId }, { $set: { items: [] } });

    // 9️⃣ Respond with success
    res.status(201).json({ success: true, orderId: newOrder._id });
  } catch (err: any) {
    console.error('Error in createCheckout:', err);
    // Handle unexpected errors
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
