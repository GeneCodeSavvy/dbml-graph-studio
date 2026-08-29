import type { ParsedSchema, SchemaField, SchemaIndex, SchemaRelation, SchemaTable } from './types';

const text = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object' && v && 'value' in v) return text((v as { value?: unknown }).value);
  return String(v);
};

const typeName = (field: any) =>
  text(field?.type?.type_name ?? field?.type?.name ?? field?.type ?? field?.dbType ?? 'unknown');

const flag = (obj: any, ...keys: string[]) => keys.some((k) => Boolean(obj?.[k]));

function normalizeField(field: any): SchemaField {
  const rawDefault = field?.dbdefault ?? field?.default ?? field?.defaultValue;
  return {
    name: text(field?.name),
    type: typeName(field),
    primary: flag(field, 'pk', 'primary', 'primaryKey'),
    unique: flag(field, 'unique'),
    notNull: flag(field, 'not_null', 'notNull', 'required'),
    increment: flag(field, 'increment', 'autoIncrement'),
    note: text(field?.note?.value ?? field?.note) || undefined,
    defaultValue: text(rawDefault?.value ?? rawDefault) || undefined,
  };
}

function normalizeIndex(index: any): SchemaIndex {
  const cols = (index?.columns ?? index?.fields ?? []).map((c: any) =>
    text(c?.value ?? c?.name ?? c),
  ).filter(Boolean);
  return {
    name: text(index?.name) || undefined,
    unique: Boolean(index?.unique),
    primary: Boolean(index?.pk ?? index?.primary),
    columns: cols,
  };
}

function endpointIsMany(ep: any) {
  return text(ep?.relation).includes('*');
}

function endpointKey(ep: any) {
  const schema = text(ep?.schemaName);
  const table = text(ep?.tableName ?? ep?.table?.name);
  return schema && schema !== 'public' ? `${schema}.${table}` : table;
}

function endpointFields(ep: any): string[] {
  return (ep?.fieldNames ?? ep?.fields ?? []).map((f: any) => text(f?.name ?? f)).filter(Boolean);
}

function allUniqueOrPk(table: SchemaTable | undefined, fields: string[]) {
  if (!table || !fields.length) return false;
  return fields.every((name) => {
    const f = table.fields.find((x) => x.name === name);
    if (f?.primary || f?.unique) return true;
    return table.indexes.some((idx) => (idx.primary || idx.unique) && idx.columns.length === 1 && idx.columns[0] === name);
  });
}

function normalizeRelation(ref: any, index: number, tableMap: Map<string, SchemaTable>): SchemaRelation | null {
  const endpoints = ref?.endpoints ?? [];
  if (endpoints.length < 2) return null;
  const a = endpoints[0];
  const b = endpoints[1];

  let source = a;
  let target = b;
  if (endpointIsMany(a) && !endpointIsMany(b)) {
    source = a; target = b;
  } else if (endpointIsMany(b) && !endpointIsMany(a)) {
    source = b; target = a;
  } else {
    const aKey = endpointKey(a), bKey = endpointKey(b);
    const aUnique = allUniqueOrPk(tableMap.get(aKey), endpointFields(a));
    const bUnique = allUniqueOrPk(tableMap.get(bKey), endpointFields(b));
    if (aUnique && !bUnique) { source = b; target = a; }
    else { source = a; target = b; }
  }

  const sTable = endpointKey(source);
  const tTable = endpointKey(target);
  if (!sTable || !tTable) return null;
  const sFields = endpointFields(source);
  const tFields = endpointFields(target);

  return {
    id: text(ref?.name) || `ref-${index}-${sTable}-${sFields.join('_')}-${tTable}-${tFields.join('_')}`,
    sourceTable: sTable,
    sourceFields: sFields,
    targetTable: tTable,
    targetFields: tFields,
    sourceRelation: text(source?.relation) || '*',
    targetRelation: text(target?.relation) || '1',
    onDelete: text(ref?.onDelete) || undefined,
    onUpdate: text(ref?.onUpdate) || undefined,
    name: text(ref?.name) || undefined,
  };
}

export function normalizeDatabase(database: any): ParsedSchema {
  const schemas = database?.schemas ?? [];
  const tables: SchemaTable[] = [];
  const refs: any[] = [];
  const enums: ParsedSchema['enums'] = [];
  const groups: ParsedSchema['groups'] = [];

  for (const schema of schemas) {
    const schemaName = text(schema?.name ?? schema?.schemaName);
    for (const table of schema?.tables ?? []) {
      const name = text(table?.name);
      const id = schemaName && schemaName !== 'public' ? `${schemaName}.${name}` : name;
      const fields = (table?.fields ?? []).map(normalizeField);
      const indexes = (table?.indexes ?? []).map(normalizeIndex);
      tables.push({
        id,
        name,
        schemaName: schemaName || undefined,
        note: text(table?.note?.value ?? table?.note) || undefined,
        fields,
        indexes,
      });
    }
    refs.push(...(schema?.refs ?? []));
    for (const e of schema?.enums ?? []) {
      enums.push({ name: text(e?.name), values: (e?.values ?? []).map((v: any) => text(v?.name ?? v)).filter(Boolean) });
    }
    for (const g of schema?.tableGroups ?? schema?.groups ?? []) {
      const tableNames = (g?.tables ?? g?.tableNames ?? []).map((t: any) => text(t?.name ?? t)).filter(Boolean);
      groups.push({ name: text(g?.name), tables: tableNames, color: text(g?.color) || undefined, note: text(g?.note?.value ?? g?.note) || undefined });
    }
  }

  // Some model versions expose refs/enums/groups at database level.
  refs.push(...(database?.refs ?? []));
  for (const e of database?.enums ?? []) {
    if (!enums.some((x) => x.name === text(e?.name))) {
      enums.push({ name: text(e?.name), values: (e?.values ?? []).map((v: any) => text(v?.name ?? v)).filter(Boolean) });
    }
  }

  const tableMap = new Map(tables.map((t) => [t.id, t]));
  const relations = refs.map((r, i) => normalizeRelation(r, i, tableMap)).filter(Boolean) as SchemaRelation[];

  return { tables, relations, enums, groups };
}
