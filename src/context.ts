import { createContext } from 'react';
import type { BContainer } from './container';

export type BBeatleContext = {
  container?: BContainer;
};

export const BeatleContext = createContext<BBeatleContext>({});
