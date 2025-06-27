import { createContext, useContext } from "react";

// Context for admin state
export interface AdminContextType {
  showMarketingDropdown: boolean;
  setShowMarketingDropdown: (show: boolean) => void;
  showShippingDropdown: boolean;
  setShowShippingDropdown: (show: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  showQuickActions: boolean;
  setShowQuickActions: (show: boolean) => void;
}

export const AdminContext = createContext<AdminContextType>({
  showMarketingDropdown: false,
  setShowMarketingDropdown: () => {},
  showShippingDropdown: false,
  setShowShippingDropdown: () => {},
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  showQuickActions: false,
  setShowQuickActions: () => {},
});

export const useAdminContext = () => useContext(AdminContext); 