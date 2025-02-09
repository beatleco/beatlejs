export function blobToData(b: Blob): Promise<string> {
  return new Promise((acc, rej) => {
    const f = new FileReader();
    f.onload = function (e) {
      if (!e.target?.result || typeof e.target.result !== "string")
        return rej();
      acc(e.target.result);
    };
    f.onerror = function () {
      rej();
    };
    f.onabort = function () {
      rej();
    };
    f.readAsDataURL(b);
  });
}

export function dataToBlob(data: string): Blob {
  const byteString = atob(data.split(",")[1]);
  const mimeString = data.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  return blob;
}

export async function serialize(ref: any): Promise<any> {
  if (
    typeof ref === "boolean" ||
    typeof ref === "number" ||
    typeof ref === "string"
  )
    return Promise.resolve(ref);

  if (typeof ref === "bigint")
    return Promise.resolve({
      __type: "BigInt",
      data: ref.toString(36),
    });

  if (typeof ref !== "object") return Promise.resolve(undefined);
  if (ref === null) return Promise.resolve(null);

  if (String(ref.__blueprint__) === "[object Object]") {
    return Promise.resolve({
      __type: "Service",
      identifier: ref.__blueprint__.identifier,
    });
  }
  if (ref instanceof Map) {
    return Promise.resolve({
      __type: "Map",
      data: Array.from(ref.entries()),
    });
  }
  if (ref instanceof Set) {
    return Promise.resolve({
      __type: "Set",
      data: Array.from(ref.keys()),
    });
  }
  if (ref instanceof Date) {
    return Promise.resolve({
      __type: "Date",
      data: ref.toISOString(),
    });
  }

  if (ref instanceof Blob) {
    return blobToData(ref).then((data) => ({
      __type: "Blob",
      data,
    }));
  }

  if (Array.isArray(ref)) {
    return Promise.all(ref.map((value) => serialize(value)));
  }

  if (String(ref) === "[object Object]") {
    const newObject: any = {};
    return Promise.all(
      Object.entries(ref).map(([key, value]) =>
        serialize(value).then((result) => {
          if (typeof result !== "undefined") newObject[key] = result;
        })
      )
    ).then(() => newObject);
  }
  return Promise.resolve(undefined);
}

export function deserialize(ref: any): any {
  if (
    typeof ref === "boolean" ||
    typeof ref === "bigint" ||
    typeof ref === "number" ||
    typeof ref === "string"
  )
    return ref;

  if (typeof ref !== "object") return undefined;
  if (ref === null) return null;

  if (Array.isArray(ref)) {
    return ref.map((value) => deserialize(value));
  }

  if (String(ref) === "[object Object]") {
    if (typeof ref.__type === "string") {
      return handleObject(ref);
    }

    const newObject: any = {};
    for (const key in ref) newObject[key] = deserialize(ref[key]);
    return newObject;
  }

  return undefined;
}

export function deserializeString<T>(data: string): T | undefined {
  try {
    return JSON.parse(data, function (_, ref) {
      if (String(ref) !== "[object Object]") return ref;
      if (typeof ref.__type !== "string") return ref;
      return handleObject(ref);
    });
  } catch (e) {
    return undefined;
  }
}

function handleObject(ref: any) {
  if (ref.__type === "Blob") {
    return dataToBlob(ref.data);
  }

  if (ref.__type === "Date") {
    return new Date(ref.data);
  }

  if (ref.__type === "Map") {
    return new Map(ref.data);
  }

  if (ref.__type === "Set") {
    return new Set(ref.data);
  }

  if (ref.__type === "BigInt") {
    return BigInt(ref.data);
  }

  return ref;
}
