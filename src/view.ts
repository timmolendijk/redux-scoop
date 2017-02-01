import { Store as ReduxStore } from 'redux';
import { IIdentifier } from '.';
import { IType } from './type';

interface IView {
  isViewComponent(value): boolean;
  getViewComponentType(component): IType;
  getViewComponentStore(component): ReduxStore<any>;
  getViewComponentId(component): IIdentifier;
}

let view: IView;

export function registerView(config: IView) {
  view = config;
}

export function isViewComponent(value) {
  if (!view || !view.isViewComponent)
    throw new Error("View needs to be registered before using this function");
  
  return view.isViewComponent(value);
}

export function getViewComponentType(component) {
  if (!view || !view.getViewComponentType)
    throw new Error("View needs to be registered before using this function");
  
  return view.getViewComponentType(component);
}

export function getViewComponentStore(component) {
  if (!view || !view.getViewComponentStore)
    throw new Error("View needs to be registered before using this function");
  
  return view.getViewComponentStore(component);
}

export function getViewComponentId(component) {
  if (!view || !view.getViewComponentId)
    throw new Error("View needs to be registered before using this function");
  
  return view.getViewComponentId(component);
}
