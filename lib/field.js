"use strict";
const view_1 = require("./view");
const type_1 = require("./type");
const instance_1 = require("./instance");
exports.decorator = (target, name, ...others) => {
    if (typeof target == 'function' || others.filter(other => other != null).length > 0)
        throw new Error("`field` decorator can only be applied to instance property");
    const Type = view_1.isViewComponent(target) ?
        view_1.getViewComponentType(target) : target.constructor;
    type_1.registerType(Type);
    function get() {
        return instance_1.default.get(this).getFieldValue(name);
    }
    function set(value) {
        instance_1.default.get(this).setFieldValue(name, value);
    }
    return { get, set, enumerable: true, configurable: true };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.decorator;
