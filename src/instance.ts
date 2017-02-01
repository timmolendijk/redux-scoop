import shallowEqual from 'recompose/shallowEqual';
import { IIdentifier } from '.';
import Store from './store';
import { IType, getKeyOfType } from './type';
import { isViewComponent, getViewComponentStore, getViewComponentId } from './view';

/**
 * Remove given promise from given collection as soon as promise resolves or rejects.
 */
async function removeOnFulfill(promise: Promise<any>, collection: Set<Promise<any>>) {
  await promise;
  collection.delete(promise);
}

const wrappeds = new WeakMap<Object, Instance>();

export default class Instance {

  static get(wrapped: Object): Instance {
    if (!wrappeds.has(wrapped))
      wrappeds.set(wrapped, new Instance(wrapped));
    return wrappeds.get(wrapped);
  }

  protected constructor(private readonly wrapped: Object) {
    this.Type = this.wrapped.constructor;

    if (isViewComponent(this.wrapped)) {
      const store = Store.get(getViewComponentStore(this.wrapped));
      const id = getViewComponentId(this.wrapped);
      if (store.hasInstance(getKeyOfType(this.Type), id))
        throw new Error("Every view component instance should be uniquely identifiable");
      this.setStore(store, id);
    }
  }

  // TODO(tim): Why not just rename `this.wrapped` to `this.value` instead?
  get value() {
    return this.wrapped;
  }

  readonly Type: IType;

  // TODO(tim): Enforce read-only?
  id: IIdentifier;

  private store: Store;

  setStore(store: Store, id?: IIdentifier) {
    if (this.store === store)
      return;
    
    if (this.store)
      throw new Error("Instance cannot belong to more than one store");
    
    // Before we assign a store try to obtain the wrapped object's identity,
    // because as soon as this instance has a store, reading the wrapped
    // object's `id` field will result in the store being queried for this
    // value, which won't work at this stage because we need an identity to
    // query the store.
    // TODO(tim): Probably better not to assume `id` property holds an
    // identifier if it exists, and instead force the user to be explicit about
    // it.
    this.id = id != null ? id : (this.wrapped as any).id;

    this.store = store;

    this.store.onFields(this, this.updateFields.bind(this));
  }

  // TODO(tim): Do we want these to reflect latest values at every point in
  // time? If so, we need to set them upon store assignment, which we currently
  // do not do.
  private readonly fields = {};

  private updateFields(fields) {
    for (const name of Object.keys(fields)) {
      // TODO(tim): Be more clever about equality.
      if (name in this.fields && shallowEqual(this.fields[name], fields[name]))
        continue;
      this.fields[name] = fields[name];
      this.notifyOnFieldValue(name, this.fields[name]);
    }
  }

  getFields() {
    return { ...this.fields };
  }

  getFieldValue(name) {
    if (this.store)
      return this.store.getFieldValue(this, name);
    return this.fields[name];
  }

  setFieldValue(name, value) {
    if (this.store)
      this.store.setFieldValue(this, name, value);
    else
      this.updateFields({ [name]: value });
  }

  private readonly listeners = {};
  private notifyOnFieldValue(name, value) {
    const listeners = this.listeners[name] || [];
    for (const listener of listeners)
      listener(value);
  }

  onFieldValue(name, listener) {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name].push(listener);
    // TODO(tim): Return unsubscriber.
  }

  private readonly pendings = new Set<Promise<any>>();

  registerPending(pending: Promise<any>) {
    this.pendings.add(pending);
    removeOnFulfill(pending, this.pendings);
  }

  getPending(): Promise<ReadonlyArray<any>> | void {
    if (this.pendings.size === 0)
      return;
    return Promise.all(this.pendings);
  }

}
