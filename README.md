# DBML Graph Studio

A Next.js SPA for editing DBML and visualizing database schemas as an interactive graph.

## Features

- Open/upload `.dbml` files and edit them in Monaco.
- Chromium File System Access API support: **Save** writes back to the same opened DBML file after permission is granted; other browsers fall back to downloading a copy.
- Official `@dbml/core` `dbmlv2` parsing and SQL export (PostgreSQL, MySQL, MSSQL, Oracle).
- dbdiagram-style table cards with columns, PK/FK/UQ/NN metadata, column-aligned relationship handles, pan/zoom, minimap, selection, and drag layout.
- Draw a relationship from an FK column handle to a referenced column to append a DBML `Ref:` statement.
- ELK automatic layered layout and community-aware layout.
- Graphology analysis:
  - Louvain community detection
  - betweenness centrality
  - PageRank
  - articulation tables
  - true graph bridge edges
  - edge betweenness ranking
- Search by table or column, community coloring, cross-community edge filtering, relationship cardinality labels.
- Manual table positions are kept in `localStorage` per filename.
- The Invello DBML schema is included as the first-run example.

## Stack

- Next.js 16 / React 19
- `@dbml/core`
- `@xyflow/react` (React Flow)
- Monaco Editor
- ELK.js
- Graphology + Louvain + graphology-metrics
- Zustand
- react-resizable-panels

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production

```bash
npm run build
npm start
```

## Important semantics

DBML is the source of truth. Dragging table cards changes only the visual layout. Creating a connection between column handles writes a new `Ref:` into the DBML source.

The DBML parser runs through a local Next.js route so `@dbml/core` can use its full Node-compatible implementation. If you deploy this application, DBML text is sent only to that deployment's `/api/parse` and `/api/export` routes.

## Roadmap

- Visual table/column creation and rename operations with DBML source transforms
- Visual relationship deletion/editing
- TableGroup editing and semantic domain labels
- Composite FK handle routing
- Sidecar layout export/import for Git-friendly layout persistence
- SQL import via `@dbml/core` importer
- Large-schema virtualization / LOD rendering
