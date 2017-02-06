"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
const shallowEqual_1 = require("recompose/shallowEqual");
const lodash_1 = require("lodash");
const instance_1 = require("./instance");
const type_1 = require("./type");
const view_1 = require("./view");
const NS = '@@scoop';
function createRef(type, id) {
    return {
        [NS]: 'ref',
        type,
        id: id != null ? id : null
    };
}
function createRefHash(ref) {
    if (ref.id == null)
        return ref.type;
    return `${ref.type}:${ref.id}`;
}
function existsInState(state, ref) {
    if (!(ref.type in state))
        return false;
    return ref.id == null || ref.id in state[ref.type];
}
function getFromState(state, type, id) {
    if (id == null)
        return state[type];
    return state[type][id];
}
function resetRender(store) {
    Store.get(store).deleteViewInstances();
}
exports.resetRender = resetRender;
exports.storeEnhancer = createStore => (externalReducer, preloadedState) => createStore((state, action) => {
    const externalState = externalReducer(lodash_1.omit(state, [NS]), action);
    return __assign({}, externalState, { [NS]: reducer(state && state[NS], action) });
}, preloadedState);
function reducer(state = {}, action) {
    if (action.type == `${NS}/CREATE`)
        if (action.ref.id == null)
            state = __assign({}, state, { [action.ref.type]: __assign({}, action.data) });
        else
            state = __assign({}, state, { [action.ref.type]: __assign({ [NS]: 'instances' }, state[action.ref.type], { [action.ref.id]: __assign({}, action.data) }) });
    if (action.type == `${NS}/UPDATE`)
        if (action.ref.id == null)
            state = __assign({}, state, { [action.ref.type]: __assign({}, state[action.ref.type], action.data) });
        else
            state = __assign({}, state, { [action.ref.type]: __assign({}, state[action.ref.type], { [action.ref.id]: __assign({}, state[action.ref.type][action.ref.id], action.data) }) });
    return state;
}
const wrappeds = new WeakMap();
class Store {
    constructor(wrapped) {
        this.wrapped = wrapped;
        this.instances = new Map();
        this.currentState = this.wrapped.getState()[NS];
        this.wrapped.subscribe(() => {
            this.previousState = this.currentState;
            this.currentState = this.wrapped.getState()[NS];
        });
    }
    static get(wrapped) {
        if (!wrappeds.has(wrapped))
            wrappeds.set(wrapped, new Store(wrapped));
        return wrappeds.get(wrapped);
    }
    hasInstance(...args) {
        let ref;
        if (args.length === 2) {
            const [type, id] = args;
            ref = createRef(type, id);
        }
        else {
            [ref] = args;
        }
        return this.instances.has(createRefHash(ref));
    }
    getInstance(ref) {
        if (!this.hasInstance(ref) && existsInState(this.currentState, ref)) {
            const Type = type_1.getTypeOfKey(ref.type);
            const instance = instance_1.default.get(new Type());
            instance.setStore(this, ref.id);
            this.setInstance(ref, instance);
        }
        return this.instances.get(createRefHash(ref));
    }
    setInstance(ref, instance) {
        return this.instances.set(createRefHash(ref), instance);
    }
    deleteViewInstances() {
        for (const [refHash, instance] of this.instances)
            if (view_1.isViewComponent(instance.value))
                this.instances.delete(refHash);
    }
    isRef(ref) {
        return typeof ref != null
            && typeof ref == 'object'
            && ref[NS] == 'ref'
            && existsInState(this.currentState, ref);
    }
    getRef(instance) {
        instance.setStore(this);
        const ref = createRef(type_1.getKeyOfType(instance.Type), instance.id);
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
    getFieldValue(instance, name) {
        return this.hydrate(getFromState(this.currentState, type_1.getKeyOfType(instance.Type), instance.id)[name]);
    }
    setFieldValue(instance, name, value) {
        const ref = this.getRef(instance);
        const dehydrated = this.dehydrate(value);
        if (shallowEqual_1.default(getFromState(this.currentState, ref.type, ref.id)[name], dehydrated))
            return;
        this.wrapped.dispatch({
            type: `${NS}/UPDATE`,
            ref,
            data: { [name]: dehydrated }
        });
    }
    onFields(instance, listener) {
        const typeKey = type_1.getKeyOfType(instance.Type);
        this.wrapped.subscribe(() => {
            const previous = this.previousState && typeKey in this.previousState ?
                getFromState(this.previousState, typeKey, instance.id) : undefined;
            const current = typeKey in this.currentState ?
                getFromState(this.currentState, typeKey, instance.id) : undefined;
            if (shallowEqual_1.default(previous, current))
                return;
            const hydrated = {};
            if (current)
                for (const name of Object.keys(current))
                    hydrated[name] = this.hydrate(current[name]);
            listener(hydrated);
        });
    }
    hydrate(data) {
        if (data == null)
            return data;
        if (Array.isArray(data))
            return data.map(this.hydrate.bind(this));
        if (this.isRef(data))
            return this.getInstance(data).value;
        if (typeof data == 'object') {
            const hydrated = {};
            for (const key in data)
                if (data.hasOwnProperty(key))
                    hydrated[key] = this.hydrate(data[key]);
            return hydrated;
        }
        return data;
    }
    dehydrate(data) {
        if (data == null)
            return data;
        if (Array.isArray(data))
            return data.map(this.dehydrate.bind(this));
        if (typeof data == 'object') {
            if (data.constructor === Object) {
                const dehydrated = {};
                for (const key in data)
                    if (data.hasOwnProperty(key))
                        dehydrated[key] = this.dehydrate(data[key]);
                return dehydrated;
            }
            return this.getRef(instance_1.default.get(data));
        }
        return data;
    }
    getPending() {
        const pendings = [...this.instances.values()]
            .map(instance => instance.getPending())
            .filter(pending => pending != null);
        if (pendings.length === 0)
            return;
        return Promise.all(pendings);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Store;
