export interface SchemaBase {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface SchemaOneOf extends SchemaBase {
  oneOf: Schema[];
}

export interface SchemaObject extends SchemaBase {
  type: 'object';
  properties?: {
    [name: string]: Schema;
  };
  required?: string[];
}

export interface SchemaArray extends SchemaBase {
  type: 'array';
  items?: Schema;
}

export interface SchemaInteger extends SchemaBase {
  type: 'integer';
  enum?: number[];
  const?: number;
  min?: number;
  max?: number;
}

export interface SchemaNumber extends SchemaBase {
  type: 'number';
  enum?: number[];
  const?: number;
  min?: number;
  max?: number;
}

export interface SchemaString extends SchemaBase {
  type: 'string';
  enum?: string[];
  const?: string;
  pattern?: string;
}

export interface SchemaBoolean extends SchemaBase {
  type: 'boolean';
  const?: boolean;
}

/** json schema 子集 */
export type Schema =
  | SchemaOneOf
  | SchemaObject
  | SchemaArray
  | SchemaInteger
  | SchemaNumber
  | SchemaString
  | SchemaBoolean;

export type IPagination = {
  pageNum?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'ascend' | 'descend';
};
