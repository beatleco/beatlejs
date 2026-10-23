function handleCase(
  parts: string[],
  key: string,
  value: unknown,
  include = true,
): value is null {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    return true;
  }

  if (value === null) {
    parts.push(`${encodeURIComponent(key)}=null`);
    return true;
  }

  if (value instanceof Date) {
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(value.toISOString())}`,
    );
    return true;
  }

  if (!include) return false;

  if (Array.isArray(value)) {
    value.forEach((item) => handleCase(parts, key, item, false));
    return true;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([subkey, item]) =>
      handleCase(parts, `${key}[${subkey}]`, item, false),
    );
    return true;
  }

  return false;
}
export function body2params(data?: Record<string, any>): string | undefined {
  if (!data) return undefined;
  const parts: string[] = [];
  Object.entries(data).forEach(([key, value]) => handleCase(parts, key, value));
  return parts.join('&');
}
