import type { ValidateFunction } from "ajv";

export function contractValidators(document: {
  components: { schemas: Record<string, unknown> };
}): Record<string, ValidateFunction>;
