import type { JSX, PropsWithChildren } from 'react';
import { createElement } from 'react';
import type { BContainer } from '../../container';
import { BeatleContext } from './context';

/**
 * Provides the Beatle context within your React application.
 *
 * @description
 * Use the Beatle context provider in your React application to make the Beatle container
 * available to all child components. This enables other hooks like `useService` and `useContainer`
 * to access the container or service instances throughout your app.
 *
 * @example
 * ```tsx
 * import { Container } from "beatlejs";
 * import { BeatleProvider } from "beatlejs/react";
 *
 * const container = Container();
 *
 * createRoot(document.getElementById("root")!).render(
 *   <StrictMode>
 *     <BeatleProvider container={container}>
 *       <App />
 *     </BeatleProvider>
 *   </StrictMode>
 * );
 * ```
 *
 * @param {BContainer} container - The Beatle container instance to be provided to the context.
 * @returns {JSX.Element} The BeatleProvider component wrapped around your application, providing context to all children.
 */
export function BeatleProvider({
  container,
  children,
}: PropsWithChildren<{ container: BContainer }>): JSX.Element {
  return (
    createElement(BeatleContext.Provider, {
      value: { container },
      children,
    }) ?? null
  );
}
