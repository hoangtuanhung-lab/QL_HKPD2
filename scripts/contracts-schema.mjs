import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// OpenAPI's discriminator is documentation for clients; oneOf validates the union.
function jsonSchema(value) {
  if (Array.isArray(value)) return value.map(jsonSchema);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "discriminator")
        .map(([key, child]) => [
          key,
          key === "$ref"
            ? child.replace("#/components/schemas/", "#/$defs/")
            : jsonSchema(child),
        ]),
    );
  }
  return value;
}

export function contractValidators(document) {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  ajv.addSchema({
    $id: "urn:hkpd:a03",
    $defs: jsonSchema(document.components.schemas),
  });
  return Object.fromEntries(
    Object.keys(document.components.schemas).map((name) => [
      name,
      ajv.compile({ $ref: `urn:hkpd:a03#/$defs/${name}` }),
    ]),
  );
}
