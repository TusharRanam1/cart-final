import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage();

export function withRequestContext(context, fn) {
  return requestContext.run(context, fn);
}

export function getContext() {
  return requestContext.getStore() || {};
}
