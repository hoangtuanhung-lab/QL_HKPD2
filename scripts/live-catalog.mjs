import { readFileSync, writeFileSync } from "node:fs";
import { athleteCatalog } from "../apps/web/src/athlete-catalog.generated.ts";
export const catalogSql = `-- BEGIN GENERATED CATALOG\ninsert into public.hkpd_catalog_details(code, detail) values\n${athleteCatalog.map((e) => `('${e.code}', '${JSON.stringify(e).replaceAll("'", "''")}'::jsonb)`).join(",\n")}\non conflict(code) do update set detail=excluded.detail;\n-- END GENERATED CATALOG`;
const path = "infra/supabase/005_live_operations.sql";
if (process.argv.includes("--write")) {
  const source = readFileSync(path, "utf8");
  const next = source.includes("-- BEGIN GENERATED CATALOG")
    ? source.replace(
        /-- BEGIN GENERATED CATALOG[\s\S]*?-- END GENERATED CATALOG/,
        catalogSql,
      )
    : source.replace(
        "create sequence if not exists",
        `${catalogSql}\ncreate sequence if not exists`,
      );
  writeFileSync(path, next);
} else if (
  process.argv.includes("--check") &&
  !readFileSync(path, "utf8").includes(catalogSql)
) {
  throw Error(
    "Live catalog migration differs from the official generated catalog",
  );
}
