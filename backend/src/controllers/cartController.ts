import { Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/authMiddleware';

// 🛒 Get current user's cart
export const getCart = async (req: AuthRequest, res: Response) => {
    
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userId = req.user.userId;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    // Process items to include temporary product data
    if (cart && cart.items) {
      const processedItems = cart.items.map((item: any) => {
        // If item has tempProductData, use it instead of populated product
        if (item.tempProductData) {
          return {
            product: item.tempProductData,
            quantity: item.quantity,
            isTemporary: true
          };
        }
        return {
          product: item.product,
          quantity: item.quantity,
          isTemporary: false
        };
      });

      return res.json({ items: processedItems });
    }

    res.json(cart || { items: [] });
  } catch (err: any) {
    console.error('Error in getCart:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// ➕ Add item to cart
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.product.equals(productId));

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    res.json({ msg: 'Item added to cart', cart });
  } catch (err: any) {
    console.error('Error in addToCart:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// ✏️ Update quantity of a cart item
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userId = req.user.userId;
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.product.equals(productId));
    if (itemIndex === -1) return res.status(404).json({ msg: 'Item not found in cart' });

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();
    res.json({ msg: 'Cart updated', cart });
  } catch (err: any) {
    console.error('Error in updateCartItem:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// ❌ Remove item from cart
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userId = req.user.userId;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    cart.items = cart.items.filter(item => !item.product.equals(productId));
    await cart.save();

    res.json({ msg: 'Item removed from cart', cart });
  } catch (err: any) {
    console.error('Error in removeFromCart:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// 🧹 Clear the cart
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authenticated' });
    }

    const userId = req.user.userId;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ msg: 'Cart not found' });

    cart.items = [];
    await cart.save();

    res.json({ msg: 'Cart cleared successfully' });
  } catch (err: any) {
    console.error('Error in clearCart:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
