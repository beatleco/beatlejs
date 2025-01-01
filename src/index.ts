export { val } from './decorators/val';
export { func } from './decorators/func';

// Plugin
export type { BPlugin, BPluginClass } from './plugin';
export {
  extendPlugins,
  MakeArrayRegistry,
  MakeSetRegistry,
} from './registries';

// Service
export { Service } from './service';
export type {
  BDescriptor,
  BServiceClass,
  BServiceDefinition,
  BServiceInstance,
  BServiceOptions,
  BServiceProto,
} from './service';

// Container
export { Container } from './container';
export type { BContainer } from './container';
//
