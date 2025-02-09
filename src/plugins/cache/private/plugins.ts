import { IdentifierSymbol } from "../../../container";
import { TypeError } from "../../../errors/TypeError";
import { BPlugin } from "../../../plugin";
import { makeQueryParams } from "../../../queryParams";
import { extendPlugins } from "../../../registries";
import { deserializeString, serialize } from "../../../serializers";
import { BServiceClass, BServiceInstance } from '../../../service';
import { CacheRegistry } from "../decorators";

type BCachableFunction = (...args: any[]) => unknown;

function CachePlugin(): BPlugin {
  return {
    async onCreate(target: BServiceClass, instance: BServiceInstance<never>) {
      const definitions = CacheRegistry.get(target);
      const identifier = instance[IdentifierSymbol];
      const cacheBox = await window.caches.open(identifier);

      if (!definitions) return;
      definitions.forEach(
        ({ propertyName, lifespan, cacheKey }) => {
          const proxyFunction: BCachableFunction = instance[propertyName];
          if (typeof proxyFunction !== 'function') {
            throw new TypeError(instance[IdentifierSymbol], propertyName, 'cache plugin only works on functions');
          }

          function generateCacheKey(...args: unknown[]) {
            let cacheReq;
            if (typeof cacheKey === 'string') {
              cacheReq = cacheKey;
            } else if (typeof cacheKey === 'function') {
              cacheReq = cacheKey.apply(instance, args);
            } else {
              cacheReq = `${propertyName}${makeQueryParams(args)}`;
            }
            return cacheReq;
          }


          async function replaceFunction(...args: unknown[]) {
            const cacheRequestKey = generateCacheKey(args);
            const match = await cacheBox.match(cacheRequestKey);
            if (match) {
              const expiresAtHeader = Number(match.headers.get('expiresat'));
              const lifespanHeader = Number(match.headers.get('lifespan'));

              if (!isNaN(lifespanHeader) && lifespanHeader == lifespan &&
                !isNaN(expiresAtHeader) && expiresAtHeader > Date.now()) {
                const text = await match.text();
                if (!text) return text;
                return deserializeString(text);
              }
            }
            const result = await Promise.resolve(proxyFunction.apply(instance, args));
            if (typeof result !== 'undefined') {
              const data = await serialize(result);
              await cacheBox.put(cacheRequestKey, new Response(JSON.stringify(data), {
                headers: {
                  'content-type': 'application/json',
                  querykey: cacheRequestKey,
                  expiresat: String(Date.now() + lifespan),
                  lifespan: String(lifespan)
                }
              }));
            }
            return result;
          }

          async function clearCache(newCacheKey: undefined | ((key: string) => (boolean | Promise<boolean>))) {
            let numDeleted = 0;

            if (newCacheKey) {
              const keys = await cacheBox.keys();
              for (const key of keys) {
                const uri = new URL(key.url);
                const queryKey = `${uri.pathname}?${uri.search}`;
                if (!(await newCacheKey(queryKey))) continue;
                const result = await cacheBox.delete(key, { ignoreMethod: true, ignoreSearch: false, ignoreVary: true });
                if (result) numDeleted++;
              }
              return numDeleted;
            }

            if (cacheKey && typeof cacheKey === 'string') {
              const result = await cacheBox.delete(cacheKey, { ignoreMethod: true, ignoreSearch: true, ignoreVary: true });
              if (result) numDeleted++;
              return numDeleted;
            }

            const result = await cacheBox.delete(propertyName, { ignoreMethod: true, ignoreSearch: true, ignoreVary: true });
            if (result) numDeleted++;
            return numDeleted;
          }

          async function replaceCache(replacer: (prev: unknown) => unknown, newCacheKey?: ((key: string) => (boolean | Promise<boolean>)),) {
            let match: Response | undefined = undefined;
            if (!newCacheKey) {
              if (cacheKey && typeof cacheKey === 'string') {
                match = await cacheBox.match(cacheKey, { ignoreMethod: true, ignoreSearch: true, ignoreVary: true });
              } else {
                match = await cacheBox.match(propertyName, { ignoreMethod: true, ignoreSearch: true, ignoreVary: true });
              }
            } else {
              const keys = await cacheBox.keys();
              for (const key of keys) {
                const uri = new URL(key.url);
                const queryKey = `${uri.pathname}?${uri.search}`;
                if (!(await newCacheKey(queryKey))) continue;
                match = await cacheBox.match(key, { ignoreMethod: true, ignoreSearch: false, ignoreVary: true });
                break;
              }
            }

            if (!match) return false;

            const text = await match.text();
            const result = await replacer(text ? deserializeString(text) : undefined);

            if (typeof result === 'undefined') return false;

            const data = await serialize(result);
            const matchKey = match.headers.get('querykey');

            if (!matchKey) return false;

            cacheBox.put(matchKey, new Response(JSON.stringify(data), {
              headers: match.headers,
            }))

            return true;
          }


          Object.defineProperty(replaceFunction, 'clear', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: clearCache,
          });
          Object.defineProperty(replaceFunction, 'replace', {
            configurable: true,
            enumerable: false,
            writable: false,
            value: replaceCache,
          });

          Object.defineProperty(instance, propertyName, {
            configurable: true,
            enumerable: false,
            writable: false,
            value: replaceFunction,
          });
        },
      );
    },
  };
}

extendPlugins(CachePlugin);
