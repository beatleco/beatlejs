export class TypeError extends Error {
  constructor(serviceName: string, propertyName: string, message: string) {
    super(`TypeError: ${serviceName}.${propertyName}: ${message}`);
  }
}