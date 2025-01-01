import { BServiceClass } from "./service";

export const NotifyEventId = 0;

export type BNotifyEvent = {
  type: typeof NotifyEventId;
  propertyName: string;
  value: unknown;
  target: BServiceClass;
  isSimilar: boolean;
};
