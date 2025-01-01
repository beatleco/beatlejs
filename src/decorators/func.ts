import type { BDescriptor } from '../service';

/**
 * Defines functions for services using `func`.
 *
 * @description
 * The `func` function is used to define methods or functions within a service. These functions can then be
 * invoked on the service instance. The `func` function allows you to define methods that are part of a service's
 * public API, making them accessible to other services or components in the application.
 *
 * @example
 * ```tsx
 * import { Service, func, val } from "beatlejs";
 *
 * const $ServiceA = Service({ identifier: 'ServiceA' }, {
 *   users: val<string[]>([]),
 *   fetchUsers: func(fetchUsers),
 *   simpleFunction: func(() => console.log('Simple function called')),
 * });
 *
 * // Use `typeof $ServiceA` to access
 * // the service instance within functions
 * function fetchUsers(this: typeof $ServiceA) {
 *   this.users.push('New User');
 * }
 * ```
 *
 * @param next - The function to be defined on the service. This can be any function you want to attach to the service.
 * @returns {BDescriptor<T>} A descriptor function that attaches the provided function to the service definition.
 */
export function func<T>(next: T): BDescriptor<T> {
  return function () {
    return next;
  };
}
