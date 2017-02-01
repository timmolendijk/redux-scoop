import { Store as ReduxStore } from 'redux';
import shallowEqual from 'recompose/shallowEqual';
import { IIdentifier } from '.';
import Instance from './instance';
import { getTypeOfKey, getKeyOfType } from './type';
import { isViewComponent } from './view';

const NS = '@@scoopy';

interface IRef {
  // `[NS]` is not a valid property definition (yet?)
  readonly '@@scoopy': 'ref';
  readonly type: string;
  readonly id: IIdentifier | null;
}

interface IExternalState {
  // `[NS]` is not a valid property definition (yet?)
  readonly '@@scoopy': IState;
  [external: string]: any;
}

interface IStateTypeInstance {
  [field: string]: boolean | string | number | IRef;
}

interface IStateTypeInstanceEntries {
  [id: string]: IStateTypeInstance;
}

type IStateTypeInstances = {
  // `[NS]` is not a valid property definition (yet?)
  readonly '@@scoopy': 'instances'
} & IStateTypeInstanceEntries;

interface IState {
  [type: string]: IStateTypeInstance | IStateTypeInstances;
}

function createRef(type: string, id: IIdentifier): IRef {
  // `[NS]` is not recognized as `'@@scoopy'`, which is why the type assertion
  // is required here.
  return {
    [NS]: 'ref',
    type,
    // Let's stick to `null` because it won't be stripped when serialized.
    id: id != null ? id : null
  } as any;
}

function createRefHash(ref: IRef): string {
  if (ref.id == null)
    return ref.type;
  return `${ref.type}:${ref.id}`;
}

function existsInState(state: IState, ref: IRef): boolean {
  if (!(ref.type in state))
    return false;
  return ref.id == null || ref.id in state[ref.type];
}

function getFromState(state: IState, type: string, id: IIdentifier) {
  if (id == null)
    return state[type];
  return state[type][id];
}

export function resetRender(store: ReduxStore<IExternalState>) {
  Store.get(store).deleteViewInstances();
}

export const storeEnhancer = createStore => (externalReducer, preloadedState) =>
  createStore((state, action) => {
    state = externalReducer(state, action);
    return {
      ...state,
      [NS]: reducer(state[NS], action)
    };
  }, preloadedState);

function reducer(state = {}, action) {
  if (action.type == `${NS}/CREATE`)
    if (action.ref.id == null)
      state = {
        ...state,
        [action.ref.type]: {
          ...action.data
        }
      };
    else
      state = {
        ...state,
        [action.ref.type]: {
          [NS]: 'instances',
          ...state[action.ref.type],
          [action.ref.id]: {
            ...action.data
          }
        }
      };
  if (action.type == `${NS}/UPDATE`)
    if (action.ref.id == null)
      state = {
        ...state,
        [action.ref.type]: {
          ...state[action.ref.type],
          ...action.data
        }
      };
    else
      state = {
        ...state,
        [action.ref.type]: {
          ...state[action.ref.type],
          [action.ref.id]: {
            ...state[action.ref.type][action.ref.id],
            ...action.data
          }
        }
      };
  return state;
}

const wrappeds = new WeakMap<ReduxStore<IExternalState>, Store>();

export default class Store {

  static get(wrapped: ReduxStore<IExternalState>): Store {
    if (!wrappeds.has(wrapped))
      wrappeds.set(wrapped, new Store(wrapped));
    return wrappeds.get(wrapped);
  }

  protected constructor(private readonly wrapped: ReduxStore<IExternalState>) {
    this.currentState = this.wrapped.getState()[NS];
    this.wrapped.subscribe(() => {
      this.previousState = this.currentState;
      this.currentState = this.wrapped.getState()[NS];
    });
  }

  private previousState: IState;
  private currentState: IState;

  // TODO(tim): Keep this map in sync with the actual objects inside
  // `this.currentState`.
  private readonly instances = new Map<string, Instance>();

  hasInstance(type: string, id: IIdentifier): boolean;
  hasInstance(ref: IRef): boolean;
  hasInstance(...args): boolean {
    let ref;
    if (args.length === 2) {
      const [type, id] = args;
      ref = createRef(type, id);
    } else {
      [ref] = args;
    }
    return this.instances.has(createRefHash(ref));
  }

  private getInstance(ref: IRef): Instance {
    if (!this.hasInstance(ref) && existsInState(this.currentState, ref)) {
      const Type = getTypeOfKey(ref.type) as ObjectConstructor;
      const instance = Instance.get(new Type());
      instance.setStore(this, ref.id);
      this.setInstance(ref, instance);
    }
    return this.instances.get(createRefHash(ref));
  }

  private setInstance(ref: IRef, instance: Instance) {
    return this.instances.set(createRefHash(ref), instance);
  }

  deleteViewInstances() {
    for (const [refHash, instance] of this.instances)
      if (isViewComponent(instance.value))
        this.instances.delete(refHash);
  }

  private isRef(ref: IRef): boolean {
    return typeof ref != null
      && typeof ref == 'object'
      && ref[NS] == 'ref'
      && existsInState(this.currentState, ref);
  }

  private getRef(instance: Instance): IRef {
    instance.setStore(this);

    const ref = createRef(getKeyOfType(instance.Type), instance.id);

    // TODO(tim): This is necessary even when we do not use `data` to guarantee
    // that any instance values on our fields are being persisted. This should
    // clearly be solved via a more comprehensive design.
    const data = this.dehydrate(instance.getFields());

    if (!existsInState(this.currentState, ref))
      this.wrapped.dispatch({
        type: `${NS}/CREATE`,
        ref,
        data
      });

    if (this.hasInstance(ref))
      this.wrapped.dispatch({
        type: `${NS}/UPDATE`,
        ref,
        data
      });
    else
      this.setInstance(ref, instance);

    return ref;
  }

  getFieldValue(instance: Instance, name: string) {
    return this.hydrate(
      getFromState(this.currentState, getKeyOfType(instance.Type), instance.id)[name]
    );
  }

  setFieldValue(instance: Instance, name: string, value) {
    const ref = this.getRef(instance);
    const dehydrated = this.dehydrate(value);

    if (shallowEqual(getFromState(this.currentState, ref.type, ref.id)[name], dehydrated))
      return;
    
    this.wrapped.dispatch({
      type: `${NS}/UPDATE`,
      ref,
      data: { [name]: dehydrated }
    });
  }

  onFields(instance: Instance, listener) {
    const typeKey = getKeyOfType(instance.Type);
    this.wrapped.subscribe(() => {
      const previous = this.previousState && typeKey in this.previousState ?
        getFromState(this.previousState, typeKey, instance.id) : undefined;
      const current = typeKey in this.currentState ?
        getFromState(this.currentState, typeKey, instance.id) : undefined;

      if (shallowEqual(previous, current))
        return;
      
      const hydrated = {};
      // TODO(tim): Most of these hydrated values can be cached most of the
      // time, but maybe it's up to `this.hydrate` to take care of that.
      if (current)
        for (const name of Object.keys(current))
          hydrated[name] = this.hydrate(current[name]);
      listener(hydrated);
    });
    // TODO(tim): Return unsubscriber.
  }

  // TODO(tim): Can we memoize this somehow?
  private hydrate(data) {
    if (data == null)
      return data;
    
    if (Array.isArray(data))
      return data.map(this.hydrate.bind(this));
    
    if (this.isRef(data))
      return this.getInstance(data).value;

    if (typeof data == 'object') {

      const hydrated = {};
      for (const key in data) if (data.hasOwnProperty(key))
        hydrated[key] = this.hydrate(data[key]);
      return hydrated;

    }

    return data;
  }

  private dehydrate(data) {
    if (data == null)
      return data;
    
    if (Array.isArray(data))
      return data.map(this.dehydrate.bind(this));
    
    if (typeof data == 'object') {

      if (data.constructor === Object) {
        const dehydrated = {};
        for (const key in data) if (data.hasOwnProperty(key))
          dehydrated[key] = this.dehydrate(data[key]);
        return dehydrated;
      }

      return this.getRef(Instance.get(data));

    }

    return data;
  }

  getPending() {
    const pendings = [...this.instances.values()]
      .map(instance => instance.getPending())
      .filter(pending => pending != null);
    
    if (pendings.length === 0)
      return;
    
    return Promise.all(pendings as ReadonlyArray<Promise<any>>);
  }

}
