import {
  Schema,
  SchemaArray,
  SchemaBoolean,
  SchemaInteger,
  SchemaNumber,
  SchemaObject,
  SchemaOneOf,
  SchemaString,
} from './type';
import { isArray, isBoolean, isInteger, isNumber, isObjectLike, isString } from 'lodash';
import * as _ from 'lodash';

// type guard
export const isSchemaOneOf = (s: Schema): s is SchemaOneOf => 'oneOf' in s;
export const isSchemaObject = (s: Schema): s is SchemaObject => !isSchemaOneOf(s) && s.type === 'object';
export const isSchemaArray = (s: Schema): s is SchemaArray => !isSchemaOneOf(s) && s.type === 'array';
export const isSchemaInteger = (s: Schema): s is SchemaInteger => !isSchemaOneOf(s) && s.type === 'integer';
export const isSchemaNumber = (s: Schema): s is SchemaNumber => !isSchemaOneOf(s) && s.type === 'number';
export const isSchemaString = (s: Schema): s is SchemaString => !isSchemaOneOf(s) && s.type === 'string';
export const isSchemaBoolean = (s: Schema): s is SchemaBoolean => !isSchemaOneOf(s) && s.type === 'boolean';

export function createList<T extends Schema>(item: T): SchemaArray {
  return {
    type: 'array',
    items: item,
  };
}

export function createPagination<T extends Schema>(item: T): SchemaObject {
  return {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      pageSize: { type: 'integer' },
      pageNum: { type: 'integer' },
      list: createList(item),
    },
    required: ['total', 'pageSize', 'pageNum', 'list'],
  };
}

export function merge<T extends Schema>(...ss: Partial<T>[]): T {
  return (_.mergeWith as any)(...ss, (target: any, origin: any) => {
    if (_.isArray(target)) return target.concat(origin);
  });
}

export function autoMock<T>(ss: Schema): T | null {
  const maybeConst =
    'const' in ss && typeof ss.const !== 'undefined' ? ss.const : 'enum' in ss && ss.enum ? ss.enum[0] : undefined;

  if (isSchemaBoolean(ss)) {
    return maybeConst || (false as any);
  }

  if (isSchemaInteger(ss) || isSchemaNumber(ss)) {
    return maybeConst || (1 as any);
  }

  if (isSchemaString(ss)) return maybeConst || ('' as any);

  if (isSchemaArray(ss)) return [] as any;

  if (isSchemaObject(ss)) {
    const re: any = {};
    ss.required?.forEach(k => {
      re[k] = autoMock(ss.properties![k]);
    });
    return re;
  }

  if (isSchemaOneOf(ss)) return autoMock(ss.oneOf[0]);

  return null;
}

export function validate(ss: Schema, data: any, path: string = '') {
  if ('const' in ss && ss.const && data !== ss.const) throw new Error('is not match const: ' + path);
  if ('enum' in ss && ss.enum && !ss.enum.some(d => d === data)) {
    throw new Error('is not match enum: ' + path);
  }

  if (isSchemaString(ss)) {
    if (!isString(data)) throw new Error('is not string: ' + path);

    if (ss.pattern && !new RegExp(ss.pattern).exec(data)) {
      throw new Error('is not match pattern: ' + path);
    }

    return data;
  }

  if (isSchemaInteger(ss)) {
    if (!isInteger(data)) throw new Error('is not integer: ' + path);
    return data;
  }

  if (isSchemaNumber(ss)) {
    if (!isNumber(data)) throw new Error('is not number: ' + path);
    return data;
  }

  if (isSchemaBoolean(ss)) {
    if (!isBoolean(data)) throw new Error('is not boolean: ' + path);
    return data;
  }

  if (isSchemaObject(ss)) {
    if (!isObjectLike(data)) throw new Error('is not object: ' + path);

    let nd: any = {};

    if (ss.properties) {
      const keys = Object.keys(ss.properties);

      // pick defined keys
      keys.forEach(k => {
        if (typeof data[k] !== 'undefined') nd[k] = validate(ss.properties![k], data[k], path ? `${path}.${k}` : k);
      });
    } else {
      nd = data;
    }

    if (ss.required) {
      ss.required.forEach(rk => {
        if (!(rk in nd)) throw new Error(`has no key '${rk}': ${path}`);
      });
    }

    return nd;
  }

  if (isSchemaArray(ss)) {
    if (!isArray(data)) throw new Error('is not array: ' + path);
    if (ss.items) data.forEach((d, i) => validate(ss.items!, d, path ? `${path}.${i}` : i + ''));
    return data;
  }

  if (isSchemaOneOf(ss)) {
    const isMatchOne = ss.oneOf.some(oneOfSchema => {
      try {
        validate(oneOfSchema, data, path);
        return true;
      } catch (_err) {
        // skip
      }
    });

    if (!isMatchOne) throw new Error('no match oneOf: ' + path);
    return data;
  }

  throw new Error(`cannot validate type: ${(ss as any).type}`);
}

export function createTsTypeLiteral(sch?: Schema): string {
  if (!sch) return 'never';

  if ('oneOf' in sch) return sch.oneOf.map(createTsTypeLiteral).join(' | ');

  if (sch.type === 'string') {
    if (sch.enum)
      return sch.enum
        .map(t =>
          // 转换成 string 字面量
          JSON.stringify(t)
        )
        .join(' | ');
    return 'string';
  }

  if (sch.type === 'integer' || sch.type === 'number') {
    if (sch.enum) return sch.enum.join(' | ');
    return 'number';
  }

  if (sch.type === 'array') {
    return `Array<${createTsTypeLiteral(sch.items as any)}>`;
  }

  if (sch.type === 'object') {
    if (sch.properties) {
      const propertyLines = Object.entries(sch.properties).map(([pn, pv]) => {
        const isRequired =
          typeof sch.required === 'boolean'
            ? sch.required
            : Array.isArray(sch.required)
            ? sch.required.includes(pn)
            : false;

        let doc: string = '';
        if (pv.title || pv.description) doc = `${pv.title || ''}(${pv.description || ''})`;

        const tsType = createTsTypeLiteral(pv);

        return `${doc ? `\n/** ${doc} */\n` : ''}${pn}${isRequired ? '' : '?'}: ${tsType}`;
      });

      return '{\n' + propertyLines.join(';\n') + '\n}';
    }

    return 'any';
  }

  return 'any';
}
