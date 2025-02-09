import { BContainer } from "../../container";
import { EffectRegistry } from "../../decorators/effect";
import { BServiceClass } from "../../service";

export function callEffects(container: BContainer, services: unknown[], instances: unknown[]) {
  if (container.isHalted()) return () => { }
  const subs: (() => void)[] = [];
  services.forEach((service, i) => {
    const defs = EffectRegistry.get(service as BServiceClass);
    if (!defs) return;
    if (!defs.size) return;
    const inst = instances[i] as Record<string, unknown>;
    defs.forEach(key => {
      if (key in inst) {
        const fn = inst[key];
        if (typeof fn === 'function') {
          const un = fn();
          if (un && typeof un === 'function')
            subs.push(un);
        }
      }
    })
  })
  return () => subs.forEach((un) => un());
}