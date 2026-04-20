import { createContext, useContext } from 'react';

export const OptionsContext = createContext(null);

export function useOptions() {
  return useContext(OptionsContext);
}
