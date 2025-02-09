import { useContext, useEffect, useMemo } from 'react';
import type { BContainer } from '../../container';
import { BeatleContext } from './context';
import { callEffects } from './callEffects';

export type BUseService<T> = {
  [K in keyof T]: T[K];
};

/**
 * Allows the usage of specific services within your React component.
 * This hook retrieves instances of services that have been defined in the container,
 * enabling you to interact with their properties and methods within the component.
 *
 * @example
 * ```tsx
 * import { Service, val, func } from "beatlejs";
 * import { useService } from "beatlejs/react";
 *
 * const $ServiceA = Service({ identifier: 'ServiceA' }, {
 *   userName: val('Beatle'),
 * });
 * const $ServiceB = Service({ identifier: 'ServiceB' }, {
 *   doSomething: func(() => alert('loaded!')),
 * });
 *
 * function MyAwesomeComponent() {
 *   const [serviceA, serviceB] = useService([$ServiceA, $ServiceB]);
 *   useEffect(() => {
 *     serviceB.doSomething('arg1', 0);
 *   }, [serviceB]);
 *
 *   return <div>Hello, {serviceA.userName}!</div>;
 * }
 * ```
 *
 * @param {T[]} services - An array of service classes that need to be retrieved from the container.
 * @param {string} [scope] - Optional service identifier to specify a particular instance of the service.
 * @returns {BUseService<T>} An array of service instances corresponding to the provided service classes.
 */
export function useService<T extends unknown[]>(
  services: [...T],
  scope?: string,
): BUseService<T> {
  const container = useContainer();
  const serviceInstances = useMemo(
    () =>
      services.map((service) =>
        container.getByClass(service, scope),
      ) as unknown as BUseService<T>,
    [],
  );
  useEffect(() => callEffects(container, services, serviceInstances), []);
  return serviceInstances;
}

/**
 * Retrieves the Beatle container from the React context.
 * This hook allows you to access the container, which holds all the registered services in your application.
 * By using this hook, you can interact with services, invoke methods, or manage service instances from anywhere within the React component tree.
 *
 * @example
 * ```tsx
 * import { useContainer } from "beatlejs/react";
 * function MyAwesomeComponent() {
 *   const container = useContainer();
 *   useEffect(() => {
 *     // Invoke all discovered `someFunction` functions with the argument 'welcome'
 *     container.invokeParallel('someFunction', 'welcome');
 *   }, [container]);
 *   return <div>Hello, world!</div>
 * }
 * ```
 *
 * @returns {BContainer} The Beatle container instance, allowing access to all registered services and their methods.
 * @throws {Error} If the container is not found in the context, the hook will throw an error. Make sure your application is wrapped in a `<BeatleProvider>`.
 */
export function useContainer(): BContainer {
  const context = useContext(BeatleContext);
  if (!context.container)
    throw new Error(
      `Please wrap your application entry with <BeatleProvider>.`,
    );
  return context.container;
}
