import { Store as ReduxStore } from 'redux';
import Store from './store';
import Instance from './instance';

export function getPending(store: ReduxStore<any>): Promise<any> | void {
  return Store.get(store).getPending();
}

const decorator: MethodDecorator = (target, name, descriptor: TypedPropertyDescriptor<Function>): TypedPropertyDescriptor<Function> => {
  
  function value(...args) {
    const result = descriptor.value.call(this, ...args);
    if (result instanceof Promise)
      Instance.get(this).registerPending(result);
    return result;
  }

  return { ...descriptor, value };
};

export { decorator as pending };
