# **BeatleJS Service Framework**

This repository provides a modular service framework using **BeatleJS**. The framework supports various plugins, including debounce, retry, signal-based communication, timer management, and more. The services are created using a functional approach and can be enhanced with decorators and plugins.

Services are designed as functional objects that can hold state, functions, and be decorated with different behaviors like debouncing or automatic retries.

## **Overview**

BeatleJS allows you to define services using the `Service` function, and these services can be augmented with various plugins such as **debounce**, **retry**, **signal**, **tags**, and **timer**. Each service is reactive and can be easily injected into components or other services using the `useService` function.

Services are designed as functional objects that can hold state, functions, and be decorated with different behaviors like debouncing or automatic retries.

## **Example Usage**

```tsx
import { Service, val, func } from 'beatlejs';
import { signal, useSignal } from 'beatlejs/plugins/signal';

const $MyService = Service(
  { identifier: 'MyService' },
  {
    count: signal(val(0)),
    increment: func(increment),
  },
);

function increment(this: typeof $MyService) {
  this.count += 1;
}

export function MyComponent() {
  const [svc] = useSignal([$MyService]);

  return (
    <button onClick={() => svc.increment()}>
      Counter: {svc.count} {/* Display the signal's value */}
    </button>
  );
}
```
