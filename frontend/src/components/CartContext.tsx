import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { CartItem } from "@/types/product";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  updateCartItemQuantity: (id: string, quantity: number, unitPrice: number, totalPrice: number) => void;
  updateCartItemCustomization: (id: string, updatedItem: CartItem) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) setCart(JSON.parse(stored));
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => [...prev, item]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    // Explicitly clear localStorage to ensure cart is completely cleared
    localStorage.removeItem("cart");
  }, []);

  const updateCartItemQuantity = useCallback((id: string, quantity: number, unitPrice: number, totalPrice: number) => {
    setCart((prev) => 
      prev.map((item) => 
        item.id === id 
          ? { ...item, quantity, unitPrice, totalPrice }
          : item
      )
    );
  }, []);

  const updateCartItemCustomization = useCallback((id: string, updatedItem: CartItem) => {
    setCart((prev) => 
      prev.map((item) => 
        item.id === id 
          ? updatedItem
          : item
      )
    );
  }, []);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, updateCartItemQuantity, updateCartItemCustomization }}>
      {children}
    </CartContext.Provider>
  );
}; 