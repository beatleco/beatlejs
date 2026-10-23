import { IdentifierSymbol } from '../../../container';
import { type BServiceClass, type BServiceInstance } from '../../../service';

export const Symbol_dataProvider = Symbol('dataProvider');
export const Symbol_onSaveTriggered = Symbol('onSaveTriggered');

export function getKey(
  target: BServiceClass,
  instance: BServiceInstance<unknown>,
) {
  return `${instance[IdentifierSymbol]}_${target.version}`;
}
