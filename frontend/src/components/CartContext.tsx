import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { CartItem } from "@/types/product";
import { getSupabase } from "@/lib/supabase";

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
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Check user authentication state
  useEffect(() => {
    const checkUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user || null);
          
          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const newUser = session?.user || null;
            
            if (event === 'SIGNED_OUT') {
              // User logged out - clear guest cart only
              console.log('🔓 User logged out - clearing guest cart');
              setCart([]);
              localStorage.removeItem("cart");
              localStorage.removeItem("guest_cart");
            } else if (event === 'SIGNED_IN' && newUser) {
              // User logged in - load their saved cart if any
              // console.log('🔐 User logged in - loading user cart');
              const userCartKey = `cart_user_${newUser.id}`;
              const storedUserCart = localStorage.getItem(userCartKey);
              if (storedUserCart) {
                try {
                  const userCart = JSON.parse(storedUserCart);
                  setCart(userCart);
                  console.log('✅ Loaded user cart:', userCart.length, 'items');
                } catch (error) {
                  console.error('Error loading user cart:', error);
                }
              }
            }
            
            setUser(newUser);
          });

          return () => subscription.unsubscribe();
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setUserLoading(false);
      }
    };
    checkUser();
  }, []);

  // Load cart from localStorage on mount (after user check)
  useEffect(() => {
    if (!userLoading) {
      if (user) {
        // Load user-specific cart
        const userCartKey = `cart_user_${user.id}`;
        const storedUserCart = localStorage.getItem(userCartKey);
        if (storedUserCart) {
          try {
            const userCart = JSON.parse(storedUserCart);
            setCart(userCart);
            console.log('🔐 Loaded user cart on mount:', userCart.length, 'items');
          } catch (error) {
            console.error('Error loading user cart:', error);
          }
        }
      } else {
        // Load guest cart
        const storedGuestCart = localStorage.getItem("cart") || localStorage.getItem("guest_cart");
        if (storedGuestCart) {
          try {
            const guestCart = JSON.parse(storedGuestCart);
            setCart(guestCart);
            console.log('👤 Loaded guest cart on mount:', guestCart.length, 'items');
          } catch (error) {
            console.error('Error loading guest cart:', error);
          }
        }
      }
    }
  }, [user, userLoading]);

  // Save cart to localStorage on change
  useEffect(() => {
    if (!userLoading) {
      if (user) {
        // Save to user-specific cart
        const userCartKey = `cart_user_${user.id}`;
        localStorage.setItem(userCartKey, JSON.stringify(cart));
        // Also maintain legacy "cart" key for compatibility
        localStorage.setItem("cart", JSON.stringify(cart));
        console.log('💾 Saved user cart:', cart.length, 'items');
      } else {
        // Save to guest cart
        localStorage.setItem("cart", JSON.stringify(cart));
        localStorage.setItem("guest_cart", JSON.stringify(cart));
        console.log('💾 Saved guest cart:', cart.length, 'items');
      }
    }
  }, [cart, user, userLoading]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => [...prev, item]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    // Clear all cart storage
    localStorage.removeItem("cart");
    localStorage.removeItem("guest_cart");
    if (user) {
      localStorage.removeItem(`cart_user_${user.id}`);
    }
  }, [user]);

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