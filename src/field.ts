import { isViewComponent, getViewComponentType } from './view';
import { IType, registerType } from './type';
import Instance from './instance';

// TODO(tim): Add function signatures for `T extends Array<any>`, to prevent
// those from being used (if that is even possible)?
export const decorator: PropertyDecorator = <T>(target, name: string, ...others): TypedPropertyDescriptor<T> => {
  if (typeof target == 'function' || others.filter(other => other != null).length > 0)
    throw new Error("`field` decorator can only be applied to instance property");
  
  const Type: IType = isViewComponent(target) ?
    getViewComponentType(target) : target.constructor;
  
  registerType(Type);

  function get(): T {
    return Instance.get(this).getFieldValue(name);
  }

  function set(value: T) {
    Instance.get(this).setFieldValue(name, value);
  }

  return { get, set, enumerable: true, configurable: true };
};

export default decorator;
