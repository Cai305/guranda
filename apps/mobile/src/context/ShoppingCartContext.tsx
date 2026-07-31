import React, { createContext, useState, useContext } from 'react';

export interface ShoppingCartProduct {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
}

export interface ShoppingCartItem {
  product: ShoppingCartProduct;
  quantity: number;
}

interface ShoppingCartContextType {
  items: ShoppingCartItem[];
  storeId: string | null;
  storeName: string;
  addItem: (product: ShoppingCartProduct, storeId: string, storeName: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  subtotal: number;
  rewardEarned: number;
  total: number;
  itemCount: number;
}

const REWARD_RATE = 0.03;

const ShoppingCartContext = createContext<ShoppingCartContextType | null>(null);

export function ShoppingCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ShoppingCartItem[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');

  const addItem = (product: ShoppingCartProduct, sid: string, sname: string) => {
    if (storeId && storeId !== sid) {
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
  const total = parseFloat(subtotal.toFixed(2));
  const rewardEarned = parseFloat((subtotal * REWARD_RATE).toFixed(2));
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <ShoppingCartContext.Provider value={{ items, storeId, storeName, addItem, removeItem, updateQty, clearCart, subtotal, rewardEarned, total, itemCount }}>
      {children}
    </ShoppingCartContext.Provider>
  );
}

export const useShoppingCart = () => {
  const ctx = useContext(ShoppingCartContext);
  if (!ctx) throw new Error('useShoppingCart must be inside ShoppingCartProvider');
  return ctx;
};
