export function getQueryParams<T>(search: string): T | null {
  let query = search;
  if (query && typeof query === 'string') {
    if (query.charAt(0) === '?') {
      query = search.substr(1);
    }
    if (query.length > 0) {
      return parseBlock(query);
    }
  }
  return null;
}

export function makeQueryParams<T>(obj: T): string {
  return `?${convertData(obj)}`;
}

function check(value: any) {
  if (typeof value === 'undefined') {
    return;
  }
  if (typeof value === 'string') {
    if (value.length < 1) {
      return;
    }
    return encodeURIComponent(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object' && String(value) === '[object Object]') {
    return encodeURIComponent(`$json${JSON.stringify(value)}`);
  }
}
function convertData(data: any) {
  return Object.keys(data)
    .reduce<string[]>((acc, key) => {
      const value = data[key];
      if (typeof value === 'string') {
        if (value.length < 1) {
          return acc;
        }
        acc.push(`${key}=${encodeURIComponent(value)}`);
        return acc;
      }
      if (typeof value === 'number') {
        acc.push(`${key}=${value}`);
        return acc;
      }
      if (typeof value === 'boolean') {
        acc.push(`${key}=${value ? 'true' : 'false'}`);
        return acc;
      }
      if (typeof value === 'object') {
        if (value === null) {
          acc.push(`${key}=null`);
          return acc;
        }
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i += 1) {
            const v = check(value[i]);
            if (v) {
              acc.push(`${key}[${i}]=${v}`);
            }
          }
        } else {
          for (const param in value) {
            const v = check(value[param]);
            if (v) {
              acc.push(`${key}[${param}]=${v}`);
            }
          }
        }
      }
      return acc;
    }, [])
    .join('&');
}
function parseBlock(block: string) {
  const obj = {} as any;
  let ks = 0;
  let ke = 0;
  let ve = 0;
  let j = 0;
  for (let i = 0; i < block.length; i += 1) {
    const c = block.charAt(i);
    if (c === '=') {
      ke = i;
      const key = block.substring(ks, ke);
      for (j = i + 1; j <= block.length; j += 1, i += 1) {
        const char = block.charAt(j);
        if (char === '&' || j === block.length) {
          ve = j;
          ks = j + 1;
          let v = block.substring(ke + 1, ve);
          if (v === 'null') {
            obj[key] = null;
          } else if (v === 'true') {
            obj[key] = true;
          } else if (v === 'false') {
            obj[key] = false;
          } else {
            v = decodeURIComponent(v);
            const num = /^[+-]?([0-9]*[.])?[0-9]+$/.test(v);
            if (!num) {
              if (v.indexOf('$json') === 0) {
                obj[key] = JSON.parse(v.substring(5));
              } else {
                obj[key] = v;
              }
            } else {
              const num = parseFloat(v);
              if (!isNaN(num)) {
                if (v.startsWith('0') && v.indexOf('.') < 0 && v !== '0') {
                  obj[key] = v;
                } else {
                  obj[key] = num;
                }
              } else {
                obj[key] = v;
              }
            }
          }
          break;
        }
      }
    }
  }
  return Object.keys(obj).reduce((acc, key) => {
    const idx = key.indexOf('[');
    if (idx > -1) {
      const nextIdx = key.indexOf(']', idx);
      if (nextIdx > -1) {
        const k = key.substring(0, idx);
        const i = key.substring(idx + 1, nextIdx);
        let cp = acc;
        if (String(Number(k)) === k && !Array.isArray(cp)) {
          cp = [];
        }
        if (String(Number(i)) === i) {
          cp[k] = cp[k] || [];
          cp[k][+i] = obj[key];
        } else {
          cp[k] = cp[k] || {};
          cp[k][i] = obj[key];
        }
        return cp;
      }
      return acc;
    }
    acc[key] = obj[key];
    return acc;
  }, {} as any);
}
