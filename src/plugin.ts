import { BContainer } from './container';
import type { BServiceClass } from './service';

export type BPluginClass = { (container?: BContainer): BPlugin };

export interface BPlugin {
  onCreate?(target: BServiceClass, instance: unknown): Promise<void>;
  onDestroy?(target: BServiceClass, instance: unknown): Promise<void>;
}
