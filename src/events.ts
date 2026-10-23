import { type BServiceClass, type BServiceInstance } from './service';

export const NotifyEventId = Symbol(0);

export type BNotifyEvent = {
  type: typeof NotifyEventId;
  propertyName: string;
  prevValue: unknown;
  value: unknown;
  target: BServiceClass;
  isSimilar: boolean;
  instance: BServiceInstance<unknown>;
};
