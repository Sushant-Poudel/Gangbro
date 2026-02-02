import { createContext, useContext } from 'react';

const CustomerContext = createContext();

export const useCustomer = () => useContext(CustomerContext);

export function CustomerProvider({ children }) {
  // Simple provider - customer auth is handled by CustomerAuth.jsx
  // This is just for context, actual logic is in the auth modal
  
  return (
    <CustomerContext.Provider value={{}}>
      {children}
    </CustomerContext.Provider>
  );
}

// Dummy component for compatibility
export function CustomerAccountSidebar() {
  return null;
}
