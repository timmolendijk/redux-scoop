"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const shallowEqual_1 = require("recompose/shallowEqual");
const store_1 = require("./store");
const type_1 = require("./type");
const view_1 = require("./view");
function removeOnFulfill(promise, collection) {
    return __awaiter(this, void 0, void 0, function* () {
        yield promise;
        collection.delete(promise);
    });
}
const wrappeds = new WeakMap();
class Instance {
    constructor(wrapped) {
        this.wrapped = wrapped;
        this.fields = {};
        this.listeners = {};
        this.pendings = new Set();
        this.Type = this.wrapped.constructor;
        if (view_1.isViewComponent(this.wrapped)) {
            const store = store_1.default.get(view_1.getViewComponentStore(this.wrapped));
            const id = view_1.getViewComponentId(this.wrapped);
            if (store.hasInstance(type_1.getKeyOfType(this.Type), id))
                throw new Error("Every view component instance should be uniquely identifiable");
            this.setStore(store, id);
        }
    }
    static get(wrapped) {
        if (!wrappeds.has(wrapped))
            wrappeds.set(wrapped, new Instance(wrapped));
        return wrappeds.get(wrapped);
    }
    get value() {
        return this.wrapped;
    }
    setStore(store, id) {
        if (this.store === store)
            return;
        if (this.store)
            throw new Error("Instance cannot belong to more than one store");
        this.id = id != null ? id : this.wrapped.id;
        this.store = store;
        this.store.onFields(this, this.updateFields.bind(this));
    }
    updateFields(fields) {
        for (const name of Object.keys(fields)) {
            if (name in this.fields && shallowEqual_1.default(this.fields[name], fields[name]))
                continue;
            this.fields[name] = fields[name];
            this.notifyOnFieldValue(name, this.fields[name]);
        }
    }
    getFields() {
        return __assign({}, this.fields);
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
    notifyOnFieldValue(name, value) {
        const listeners = this.listeners[name] || [];
        for (const listener of listeners)
            listener(value);
    }
    onFieldValue(name, listener) {
        this.listeners[name] = this.listeners[name] || [];
        this.listeners[name].push(listener);
    }
    registerPending(pending) {
        this.pendings.add(pending);
        removeOnFulfill(pending, this.pendings);
    }
    getPending() {
        if (this.pendings.size === 0)
            return;
        return Promise.all(this.pendings);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Instance;
