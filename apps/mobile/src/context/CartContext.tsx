import React, { createContext, useState, useContext } from 'react';

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  storeId: string | null;
  storeName: string;
  addItem: (product: CartProduct, storeId: string, storeName: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const DELIVERY_FEE = 20;
const SERVICE_FEE_RATE = 0.015;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');

  const addItem = (product: CartProduct, sid: string, sname: string) => {
    if (storeId && storeId !== sid) {
      // New store — clear cart first
      setItems([{ product, quantity: 1 }]);
      setStoreId(sid);
      setStoreName(sname);
      return;
    }
    setStoreId(sid);
    setStoreName(sname);
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.product.id !== productId);
      if (next.length === 0) { setStoreId(null); setStoreName(''); }
      return next;
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => { setItems([]); setStoreId(null); setStoreName(''); };

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const serviceFee = parseFloat((subtotal * SERVICE_FEE_RATE).toFixed(2));
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const total = parseFloat((subtotal + serviceFee + deliveryFee).toFixed(2));
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, storeId, storeName, addItem, removeItem, updateQty, clearCart, subtotal, serviceFee, deliveryFee, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
