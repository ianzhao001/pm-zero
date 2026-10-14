import path from 'node:path';
import { fail } from './errors.mjs';

function typeMatches(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

function resolveLocalRef(rootSchema, reference) {
  if (!reference.startsWith('#/')) return null;
  return reference.slice(2).split('/').reduce((value, segment) => value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], rootSchema);
}

function validateValue(value, schema, at, errors, rootSchema = schema) {
  if (schema.$ref) {
    const resolved = resolveLocalRef(rootSchema, schema.$ref);
    if (!resolved) {
      errors.push(`${at} has unresolved schema reference ${schema.$ref}`);
      return;
    }
    validateValue(value, resolved, at, errors, rootSchema);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${at} must equal ${JSON.stringify(schema.const)}`);
  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${at} must be ${schema.type}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${at} must be one of ${schema.enum.join(', ')}`);
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at} must not be empty`);
    if (schema.pattern && !(new RegExp(schema.pattern)).test(value)) errors.push(`${at} has invalid format`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${at} must be >= ${schema.minimum}`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at} needs at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${at} allows at most ${schema.maxItems} item(s)`);
    if (schema.uniqueItems && new Set(value.map((x) => JSON.stringify(x))).size !== value.length) errors.push(`${at} must contain unique items`);
    if (schema.items) value.forEach((item, index) => validateValue(item, schema.items, `${at}[${index}]`, errors, rootSchema));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${at}.${key} is required`);
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${at}.${key} is not allowed`);
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) validateValue(value[key], propertySchema, `${at}.${key}`, errors, rootSchema);
    }
  }
  for (const conditional of schema.allOf ?? []) {
    const probe = [];
    validateValue(value, conditional.if, at, probe, rootSchema);
    if (probe.length === 0 && conditional.then) validateValue(value, conditional.then, at, errors, rootSchema);
  }
}

export function jsonSchemaErrors(value, schema, at = '$') {
  const errors = [];
  validateValue(value, schema, at, errors, schema);
  return errors;
}

export function validateArgs(name, args, schema) {
  const errors = jsonSchemaErrors(args, schema);
  if (args && typeof args.project_path === 'string' && !path.isAbsolute(args.project_path)) {
    errors.push('$.project_path must be absolute');
  }
  if (errors.length) fail('E_ARGS_INVALID', `Invalid arguments for ${name}`, { errors });
}
