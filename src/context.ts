import { createContext } from 'react';
import type { BContainer } from './container';

/**
 * Interface for the Beatle context.
 *
 * @description
 * This interface defines the shape of the context that holds the `container`
 * used by the Beatle framework in React applications. The context is
 * responsible for providing the container to other parts of the application
 * where it's needed. The `container` holds all services, which can be accessed
 * and managed throughout the app.
 *
 * @property container - The Beatle container that stores and manages the services.
 *   It is optional and may not always be available.
 */
export type BBeatleContext = {
  /**
   * The container instance used to manage services within the Beatle framework.
   * It is optional because the container might not be set up in some parts of the app.
   */
  container?: BContainer;
};

/**
 * Beatle context with no state, ensuring no redundant renders
 * while services are being updated or changed.
 *
 * @description
 * The `BeatleContext` is used as a provider for the React application to inject
 * the `container` into components that need it. This context ensures that no
 * redundant re-renders occur when services are updated or changed, promoting
 * efficient state management in the application.
 *
 * @example
 * ```tsx
 * const container = Container();
 * createRoot(document.getElementById("root")!).render(
 *   <BeatleProvider container={container}>
 *     <App />
 *   </BeatleProvider>
 * );
 * ```
 */
export const BeatleContext = createContext<BBeatleContext>({});
