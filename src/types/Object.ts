import * as t from 'io-ts';
import { LoiDecoratorNullAsUndefined } from '../decorators/nullAsUndefined';
import { decorate, ILoiOption, LoiFactory, metadata } from '../utilties/factory';
import { isString, objectMapValues } from '../utilties/lodash';
import { LoiFactoryBase } from './Base';

/** @internal */
export interface ILoiOptionObject extends ILoiOption {
  name: string,
  type?: Function,
  instanceof?: Function,
  strict?: boolean,
  violet?: boolean,
}


/** @internal */
export function getNameFromProps(required: t.Props = {}, optional: t.Props = {}): string {
  const result = `{ ${[
    ...Object.keys(required).map((k) => `${k}: ${required[k].name}`),
    ...Object.keys(optional).map((k) => `${k}?: ${optional[k].name}`),
  ].join(', ')} }`

  return result === "{  }" ? "{}" : result;
}

/** @internal */
export function nullablePartial<P extends t.Props>(props: P, name?: string): t.PartialType<P, t.TypeOfPartialProps<P>, t.OutputOfPartialProps<P>> {
  return t.partial(objectMapValues(props, (i) => new LoiDecoratorNullAsUndefined(i) as typeof i) as P, name);
}

/** @internal */
export function interfaceWithOptionals<R extends t.Props, O extends t.Props>(
  required: R,
  optional: O,
  name?: string
): t.IntersectionType<[t.InterfaceType<R, t.TypeOfProps<R>, t.OutputOfProps<R>>, t.PartialType<O, t.TypeOfPartialProps<O>, t.OutputOfPartialProps<O>>], t.TypeOfProps<R> & t.TypeOfPartialProps<O>, t.OutputOfProps<R> & t.OutputOfPartialProps<O>> {
  return t.intersection([t.interface(required), nullablePartial(optional)], name)
}

/**
 * Return a new type that validates successfully only
 * when the instance (object) contains no unknow properties.
 *
 * https://github.com/gunzip/digital-citizenship-functions/blob/cd5c57629cb188dbda4b03037fbb399115fd6d29/lib/utils/types.ts#L92
 * https://github.com/gcanti/io-ts/issues/106
 *
 * @required  required properties
 * @optional   optional object properties
 * @internal
 */
export function strictInterfaceWithOptionals<R extends t.Props, O extends t.Props>(
  required: R,
  optional: O,
  name: string
): t.Type<t.TypeOfProps<R> & t.TypeOfPartialProps<O>, t.OutputOfProps<R> & t.OutputOfPartialProps<O>, {}> {
  const loose = t.intersection([t.interface(required), nullablePartial(optional)]);
  const props = Object.assign({}, required, optional);
  const newType = new t.Type(
    name,
    (v): v is t.TypeOfProps<R> & t.TypeOfPartialProps<O> =>
      loose.is(v) &&
      Object.getOwnPropertyNames(v).every((k) => props.hasOwnProperty(k)),
    (s, c) =>
      loose.validate(s, c).chain((o) => {
        const errors: t.Errors = Object.getOwnPropertyNames(o)
          .map(
            (key) =>
              !props.hasOwnProperty(key)
                ? t.getValidationError(o[key], t.appendContext(c, key, t.never))
                : undefined
          )
          .filter((e): e is t.ValidationError => e !== undefined);
        return errors.length ? t.failures(errors) : t.success(o);
      }),
    loose.encode
  );
  (<any>newType)._tag = 'StrictInterfaceWithOptionalsType';
  return newType as any;
}

/** @internal */
export function violetInterfaceWithOptionals<R extends t.Props, O extends t.Props>(
  required: R,
  optional: O,
  name: string
): t.Type<t.TypeOfProps<R> & t.TypeOfPartialProps<O>, t.OutputOfProps<R> & t.OutputOfPartialProps<O>, {}> {
  const loose = t.intersection([t.interface(required), nullablePartial(optional)]);
  const props = Object.assign({}, required, optional);
  const newType = new t.Type(
    name,
    (v): v is t.TypeOfProps<R> & t.TypeOfPartialProps<O> => loose.is(v),
    (s, c) =>
      loose.validate(s, c).chain((o) => {
        const keys = Object.getOwnPropertyNames(o)
        const newObject: t.OutputOfProps<R> & t.OutputOfPartialProps<O> = {} as any;
        const len = keys.length
        for (let i = 0; i < len; i++) {
          const key = keys[i]
          if (props.hasOwnProperty(key)) {
            newObject[key] = o[key];
          }
        }
        return t.success(newObject)
      }),
    loose.encode
  );
  (<any>newType)._tag = 'VioletInterfaceWithOptionalsType';
  return newType as any;
}

/** @internal */
export const loiObjectRequired = Symbol('loiObjectRequired')
/** @internal */
export const loiObjectOptional = Symbol('loiObjectOptional')

type Clean<T extends t.Any> = t.Type<T['_A'], T['_O'], T['_I']>
export type LoiFactoryTypeObject<R extends t.Props, O extends t.Props, T extends t.Any> = T & LoiFactoryObject<R, O, T> & LoiFactoryBase<T>
export type LoiFactoryTypeObjectInitial<R extends t.Props, O extends t.Props, T extends t.Any> = T & LoiFactoryObjectInitial<R, O, T> & LoiFactoryObject<R, O, T> & LoiFactoryBase<T>

export class LoiFactoryObject<R extends t.Props, O extends t.Props, T extends t.Any> extends LoiFactory<T> {
  /** @internal */
  [loiObjectRequired]: R

  /** @internal */
  [loiObjectOptional]: O

  /** @internal */
  static decorate<R extends t.Props, O extends t.Props, T extends t.Any>(t: T): LoiFactoryTypeObject<R, O, T> {
    return LoiFactoryBase.decorate(decorate<T, LoiFactoryObject<R, O, t.Type<T['_A'], T['_O'], T['_I']>>>(this, t));
  }

  public type<F>(constructor: { new(...args: any[]): F }) {
    const type = t.refinement(this, (i: any) => i && i.constructor === constructor) as t.Type<this['_A'] & F, this['_O'] & F, this['_I']>
    return metadata(LoiFactoryObject.decorate<R, O, Clean<typeof type>>(type), {
      parent: this,
      option: <ILoiOptionObject>{ name: `type ${constructor.name}`, type: constructor }
    });
  }

  public instanceof<F>(constructor: { new(...args: any[]): F }) {
    const type = t.refinement(this, (i: any) => i instanceof constructor) as t.Type<this['_A'] & F, this['_O'] & F, this['_I']>
    return metadata(LoiFactoryObject.decorate<R, O, Clean<typeof type>>(type), {
      parent: this,
      option: <ILoiOptionObject>{ name: `instanceof ${constructor.name}`, instanceof: constructor }
    });
  }
}

export class LoiFactoryObjectInitial<R extends t.Props, O extends t.Props, T extends t.Any> extends LoiFactory<T> {
  /** @internal */
  [loiObjectRequired]: R

  /** @internal */
  [loiObjectOptional]: O

  /** @internal */
  static decorate<R extends t.Props, O extends t.Props, T extends t.Any>(t: T): LoiFactoryTypeObjectInitial<R, O, T> {
    return LoiFactoryObject.decorate(LoiFactoryBase.decorate(decorate<T, LoiFactoryObjectInitial<R, O, t.Type<T['_A'], T['_O'], T['_I']>>>(this, t)));
  }

  public strict() {
    const type = strictInterfaceWithOptionals(this[loiObjectRequired], this[loiObjectOptional], this.name)
    return metadata(LoiFactoryObject.decorate<R, O, Clean<T>>(type), {
      parent: this,
      option: <ILoiOptionObject>{ name: `strict`, strict: true }
    });
  }

  public violet() {
    const type = violetInterfaceWithOptionals(this[loiObjectRequired], this[loiObjectOptional], this.name)
    return metadata(LoiFactoryObject.decorate<R, O, Clean<T>>(type), {
      parent: this,
      option: <ILoiOptionObject>{ name: `violet`, violet: true }
    });
  }
}

export function object(
  name?: string
): LoiFactoryTypeObjectInitial<
  { },
  { },
  t.Type<
    { },
    { },
    t.mixed
  >
>

export function object<R extends t.Props = {}>(
  required: R,
  name?: string
): LoiFactoryTypeObjectInitial<
  { [K in keyof R]: t.Type<R[K]['_A'], R[K]['_O'], R[K]['_I']> },
  { },
  t.Type<
    { [K in keyof R]: t.TypeOf<R[K]> },
    { [K in keyof R]: t.OutputOf<R[K]> },
    t.mixed
  >
>

export function object<R extends t.Props = {}, O extends t.Props = {}>(
  required: R,
  optional: O,
  name?: string
): LoiFactoryTypeObjectInitial<
  { [K in keyof R]: t.Type<R[K]['_A'], R[K]['_O'], R[K]['_I']> },
  { [K in keyof O]: t.Type<O[K]['_A'], O[K]['_O'], O[K]['_I']> },
  t.Type<
    { [K in keyof R]: t.TypeOf<R[K]> } & { [K in keyof O]?: t.TypeOf<O[K]> },
    { [K in keyof R]: t.OutputOf<R[K]> } & { [K in keyof O]?: t.OutputOf<O[K]> },
    t.mixed
  >
>

export function object(a?: any, b?: any, c?: any) {
  let required, optional, name
  if ((a === null || a === undefined) && (b === null || b === undefined) && (c === null || c === undefined)) {
    required = {}
    optional = {}
    name = getNameFromProps(required, optional)
  } else if ((b === null || b === undefined) && (c === null || c === undefined)) {
    if (isString(a)) {
      required = {}
      optional = {}
      name = a
    } else {
      required = a
      optional = {}
      name = getNameFromProps(required, optional)
    }
  } else if ((c === null || c === undefined)) {
    if (isString(b)) {
      required = a
      optional = {}
      name = b
    } else {
      required = a
      optional = b
      name = getNameFromProps(required, optional)
    }
  } else {
    required = a
    optional = b
    name = c
  }

  const type = interfaceWithOptionals(required, optional, name);
  const decorated = metadata(LoiFactoryObjectInitial.decorate(type), {
    tag: name
  });
  decorated[loiObjectRequired] = required;
  decorated[loiObjectOptional] = optional;
  return decorated;
}
