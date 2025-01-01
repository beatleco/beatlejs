import { BServiceClass } from "../../../service";

export const Symbol_dataProvider = Symbol('dataProvider');
export const Symbol_onSaveTriggered = Symbol('onSaveTriggered');

export function getKey(target: BServiceClass) {
  return `${target.identifier}_${target.version}`;
}
