# Wrangler Configuration

- Always check if wrangler is installed (`npm i -g wrangler@latest`).
- Ask the user which environments they need (development, staging, production) and the project name.
- Setup `wrangler.jsonc` following this schema (replace placeholders with project name and general names, the code below is a generalized template to follow):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": "src/cloudflare/worker.ts",
  "name": "project-name",
  "compatibility_date": "2025-09-15",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
  },
  "preview_urls": false,
  "workers_dev": true,
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
  },
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_ID",
      "remote": true,
    },
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "project-db-name",
      "database_id": "YOUR_D1_ID",
      "remote": true,
    },
  ],
  "ai": {
    "binding": "AI",
    "remote": true,
  },
  "durable_objects": {
    "bindings": [
      {
        "class_name": "ExampleDurableObject",
        "name": "EXAMPLE_DURABLE_OBJECT",
      },
    ],
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["ExampleDurableObject"],
    },
  ],
  "r2_buckets": [
    {
      "binding": "MY_BUCKET",
      "bucket_name": "my-bucket",
      "remote": true,
    },
  ],
  "triggers": {
    "crons": ["0 0 * * *"],
  },
  "env": {
    "development": {
      "name": "project-name-development",
      "vars": {
        "SECRET_ENVIRONMENT_STATUS": "live",
      },
      "durable_objects": {
        "bindings": [
          {
            "class_name": "ExampleDurableObject",
            "name": "EXAMPLE_DURABLE_OBJECT",
          },
        ],
      },
      "migrations": [
        {
          "tag": "v1",
          "new_sqlite_classes": ["ExampleDurableObject"],
        },
      ],
      "kv_namespaces": [
        {
          "binding": "KV",
          "id": "YOUR_KV_ID",
          "remote": true,
        },
      ],
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "project-db-development",
          "database_id": "YOUR_D1_ID",
          "remote": true,
        },
      ],
      "r2_buckets": [
        {
          "binding": "MY_BUCKET",
          "bucket_name": "my-bucket-development",
          "remote": true,
        },
      ],
      "ai": { "binding": "AI" },
    },
    "production": {
      "name": "project-name",
      "vars": { "SECRET_ENVIRONMENT_STATUS": "live" },
      "durable_objects": {
        "bindings": [
          {
            "class_name": "ExampleDurableObject",
            "name": "EXAMPLE_DURABLE_OBJECT",
          },
        ],
      },
      "migrations": [
        {
          "tag": "v1",
          "new_sqlite_classes": ["ExampleDurableObject"],
        },
      ],
      "ai": { "binding": "AI", "remote": true },
    },
  },
}
```

- Create a `db` folder with a basic `schema.sql` (e.g., simple `user` table).
- Add scripts to `package.json` for `wrangler-types: "wrangler types"`, `wrangler-dev`, `build`, and `deploy-*`.
  - e.g. `"deploy-development": "npx wrangler@latest deploy --env=\"development\" && npx wrangler d1 execute project-db-development --file=db/schema.sql"`
