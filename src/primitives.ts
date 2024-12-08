import type { BDescriptor } from './service';

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

/**
 * Defines primitive values within services using `val`.
 *
 * @description
 * The `val` function is used to define simple, primitive values within a service. This function is ideal for defining
 * properties that you want to store within a service, such as strings, numbers, booleans, or arrays, that can be accessed
 * and modified as part of the service's state.
 *
 * @example
 * ```tsx
 * import { Service, val } from "beatlejs";
 *
 * const $ServiceA = Service({ identifier: 'ServiceA' }, {
 *   userName: val('Beatle'),
 * });
 * ```
 *
 * @param next - The primitive value to be defined on the service. This could be a string, number, array, or any primitive type.
 *
 * @returns {BDescriptor<T>} A descriptor function that attaches the provided value to the service definition.
 */
export function val<T>(next: T): BDescriptor<T> {
  return function () {
    return next;
  };
}
