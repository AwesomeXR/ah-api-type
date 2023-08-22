import { validate, merge, SchemaObject, createTsTypeLiteral } from '../src';

describe('validate', () => {
  it('string', () => {
    expect(() => validate({ type: 'string', pattern: '^[0-9]$' }, 123)).toThrow(/is not string/);
    expect(() => validate({ type: 'string', pattern: '^[0-9]$' }, 'abc')).toThrow(/is not match pattern/);
  });

  it('complex', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        mobile: { type: 'string', pattern: '^[0-9]{11}$' },
        address: {
          type: 'object',
          properties: {
            provinceCode: { type: 'integer' },
          },
          required: ['provinceCode'],
        },
      },
      required: ['mobile'],
    };

    expect(() => validate(schema, { mobile: '15558118985', address: { provinceCode: 'x' } })).toThrow(
      /is not integer: address.provinceCode/
    );
  });
});

describe('merge', () => {
  it('object', () => {
    expect(
      merge<SchemaObject>(
        {
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'integer' } },
          required: ['a', 'b'],
        },
        {
          type: 'object',
          properties: { c: { type: 'boolean' } },
          required: ['c'],
        }
      )
    ).toEqual({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'integer' }, c: { type: 'boolean' } },
      required: ['a', 'b', 'c'],
    });
  });
});

describe('createTsTypeLiteral', () => {
  it('oneOf', () => {
    const tsType = createTsTypeLiteral({
      oneOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { type: 'object', properties: { b: { type: 'string' } } },
      ],
    });

    expect(tsType).toMatchSnapshot();
  });

  it('oneOf deep', () => {
    const tsType = createTsTypeLiteral({
      oneOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        {
          type: 'object',
          properties: {
            b: { type: 'string' },
            c: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    cs1: { type: 'string' },
                  },
                  required: ['cs1'],
                },
                {
                  type: 'object',
                  properties: {
                    cs2: { type: 'string' },
                  },
                  required: ['cs2'],
                },
              ],
            },
          },
        },
      ],
    });

    expect(tsType).toMatchSnapshot();
  });

  it('string enum', () => {
    const tsType = createTsTypeLiteral({
      type: 'string',
      enum: ['a', 'b', 'c'],
    });

    expect(tsType).toMatchSnapshot();
  });

  it('integer enum', () => {
    const tsType = createTsTypeLiteral({
      type: 'integer',
      enum: [1, 2, 3],
    });

    expect(tsType).toMatchSnapshot();
  });
});
