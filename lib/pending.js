"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
const store_1 = require("./store");
const instance_1 = require("./instance");
function getPending(store) {
    return store_1.default.get(store).getPending();
}
exports.getPending = getPending;
const decorator = (target, name, descriptor) => {
    function value(...args) {
        const result = descriptor.value.call(this, ...args);
        if (result instanceof Promise)
            instance_1.default.get(this).registerPending(result);
        return result;
    }
    return __assign({}, descriptor, { value });
};
exports.pending = decorator;
