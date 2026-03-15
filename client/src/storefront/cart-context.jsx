import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'noire-cart-v1';

function isSameLine(a, b) {
  if (a.variantId || b.variantId) {
    return Boolean(a.variantId && b.variantId && a.variantId === b.variantId);
  }
  return a.productId === b.productId && a.size === b.size && a.color === b.color;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setItems(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      subtotal,
      count,
      addItem: (item) => {
        setItems((prev) => {
          const idx = prev.findIndex((line) => isSameLine(line, item));
          if (idx === -1) return [...prev, item];
          return prev.map((line, i) =>
            i === idx ? { ...line, quantity: line.quantity + item.quantity } : line
          );
        });
      },
      updateQty: (item, quantity) => {
        if (quantity <= 0) {
          setItems((prev) => prev.filter((line) => !isSameLine(line, item)));
          return;
        }
        setItems((prev) =>
          prev.map((line) => (isSameLine(line, item) ? { ...line, quantity } : line))
        );
      },
      removeItem: (item) => {
        setItems((prev) => prev.filter((line) => !isSameLine(line, item)));
      },
      clearCart: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
