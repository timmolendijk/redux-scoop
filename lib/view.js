"use strict";
let view;
function registerView(config) {
    view = config;
}
exports.registerView = registerView;
function isViewComponent(value) {
    if (!view || !view.isViewComponent)
        throw new Error("View needs to be registered before using this function");
    return view.isViewComponent(value);
}
exports.isViewComponent = isViewComponent;
function getViewComponentType(component) {
    if (!view || !view.getViewComponentType)
        throw new Error("View needs to be registered before using this function");
    return view.getViewComponentType(component);
}
exports.getViewComponentType = getViewComponentType;
function getViewComponentStore(component) {
    if (!view || !view.getViewComponentStore)
        throw new Error("View needs to be registered before using this function");
    return view.getViewComponentStore(component);
}
exports.getViewComponentStore = getViewComponentStore;
function getViewComponentId(component) {
    if (!view || !view.getViewComponentId)
        throw new Error("View needs to be registered before using this function");
    return view.getViewComponentId(component);
}
exports.getViewComponentId = getViewComponentId;
