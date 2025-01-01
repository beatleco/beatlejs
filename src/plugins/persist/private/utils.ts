import { BContainer } from "../../../container";
import { BServiceClass, BServiceDefinition, BServiceInstance } from "../../../service";


export function debounce(fn: (...args: any) => void, ms: number) {
  let tm: number | undefined = undefined;
  return function replacement(...args: any[]) {
    if (tm) {
      clearTimeout(tm);
      tm = undefined;
    }
    tm = setTimeout(() => {
      fn.apply(null, args);
      tm = undefined;
    }, ms) as unknown as number;
  };
}

export  function restoreServiceSnapshot(
  container: BContainer,
  target: BServiceDefinition | BServiceClass,
  snapshot?: Record<string, unknown>,
) {
  if (!snapshot) return;
  const instance = container.getByClass<Record<string, unknown>>(target);
  Object.entries(snapshot).forEach(([propertyName, value]) => {
    if (!(propertyName in instance)) return;
    instance[propertyName] = value;
  });
}

export function getServiceSnapshot(
  instance: BServiceInstance<never>,
  properties?: Set<string>,
) {
  if (!properties) return;
  const output: Record<string, unknown> = {};
  let isServiceExportable = false;
  properties.forEach((propertyName) => {
    output[String(propertyName)] = instance[propertyName];
    isServiceExportable = true;
  });
  if (!isServiceExportable) return;
  return output;
}
