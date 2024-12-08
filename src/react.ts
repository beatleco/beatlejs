import type { JSX, PropsWithChildren } from 'react';
import React, { useContext } from 'react';

import type { BContainer } from './container';
import { BeatleContext } from './context';

export type BUseService<T> = {
  [K in keyof T]: T[K];
};

export function useService<T extends unknown[]>(
  services: [...T],
  id?: string,
): BUseService<T> {
  const container = useContainer();
  return services.map((service) =>
    container.getByClass(service, id),
  ) as unknown as BUseService<T>;
}

export function useContainer(): BContainer {
  const context = useContext(BeatleContext);
  if (!context.container)
    throw new Error(
      `Please wrap your application entry with <BeatleProvider>.`,
    );
  return context.container;
}

export function BeatleProvider({
  container,
  children,
}: PropsWithChildren<{ container: BContainer }>): JSX.Element {
  return (
    React.createElement(BeatleContext.Provider, {
      value: { container },
      children,
    }) ?? null
  );
}
