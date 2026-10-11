// Generated from A03; npm run offline:schema regenerates, offline:check detects drift.
export const schemas = {
  $defs: {
    SyncSubmission: {
      type: "object",
      additionalProperties: false,
      properties: {
        operation_id: { type: "string", format: "uuid" },
        base_version: {
          type: "integer",
          minimum: 0,
          maximum: 9007199254740991,
        },
        assignment_snapshot_id: { type: "string", format: "uuid" },
        submission: { $ref: "#/$defs/CreateSubmission" },
      },
      required: [
        "operation_id",
        "base_version",
        "assignment_snapshot_id",
        "submission",
      ],
      examples: [
        {
          operation_id: "00000000-0000-4000-8000-000000000015",
          base_version: 0,
          assignment_snapshot_id: "00000000-0000-4000-8000-000000000016",
          submission: {
            match_id: "00000000-0000-4000-8000-000000000008",
            base_official_version: 0,
            payload: {
              rule_snapshot_id: "00000000-0000-4000-8000-000000000007",
              entries: [
                {
                  participant: {
                    kind: "athlete",
                    athlete_id: "00000000-0000-4000-8000-000000000004",
                  },
                  value: { kind: "time", seconds: "12.340" },
                },
              ],
              file_ids: [],
            },
          },
        },
      ],
    },
    CreateSubmission: {
      type: "object",
      additionalProperties: false,
      properties: {
        match_id: { type: "string", format: "uuid" },
        base_official_version: {
          type: "integer",
          minimum: 0,
          maximum: 9007199254740991,
        },
        payload: { $ref: "#/$defs/ResultPayload" },
        reason: {
          type: "string",
          minLength: 1,
          maxLength: 2000,
          pattern: "\\S",
          description:
            "Lý do sửa; server bắt buộc khi đã có kết quả chính thức. Lưu audit theo submission ID, không công khai.",
        },
      },
      required: ["match_id", "base_official_version", "payload"],
      examples: [
        {
          match_id: "00000000-0000-4000-8000-000000000008",
          base_official_version: 0,
          payload: {
            rule_snapshot_id: "00000000-0000-4000-8000-000000000007",
            entries: [
              {
                participant: {
                  kind: "athlete",
                  athlete_id: "00000000-0000-4000-8000-000000000004",
                },
                value: { kind: "time", seconds: "12.340" },
              },
            ],
            file_ids: [],
          },
        },
      ],
    },
    ResultPayload: {
      type: "object",
      additionalProperties: false,
      properties: {
        rule_snapshot_id: { type: "string", format: "uuid" },
        entries: {
          type: "array",
          items: { $ref: "#/$defs/ResultEntry" },
          minItems: 1,
        },
        file_ids: {
          type: "array",
          items: { type: "string", format: "uuid" },
          uniqueItems: true,
        },
      },
      required: ["rule_snapshot_id", "entries", "file_ids"],
    },
    ResultEntry: {
      type: "object",
      additionalProperties: false,
      properties: {
        participant: { $ref: "#/$defs/Participant" },
        value: { $ref: "#/$defs/ResultValue" },
      },
      required: ["participant", "value"],
    },
    Participant: {
      oneOf: [
        { $ref: "#/$defs/AthleteParticipant" },
        { $ref: "#/$defs/TeamParticipant" },
      ],
    },
    AthleteParticipant: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["athlete"] },
        athlete_id: { type: "string", format: "uuid" },
      },
      required: ["kind", "athlete_id"],
    },
    TeamParticipant: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["team"] },
        team_id: { type: "string", format: "uuid" },
      },
      required: ["kind", "team_id"],
    },
    ResultValue: {
      oneOf: [
        { $ref: "#/$defs/TimeValue" },
        { $ref: "#/$defs/DistanceValue" },
        { $ref: "#/$defs/PointsValue" },
        { $ref: "#/$defs/ScoreValue" },
        { $ref: "#/$defs/SetsValue" },
        { $ref: "#/$defs/CardsValue" },
        { $ref: "#/$defs/RankValue" },
      ],
      examples: [
        { kind: "distance", metres: "5.010" },
        { kind: "points", points: "-0.50" },
        { kind: "score", scored: 2, conceded: 1 },
        { kind: "sets", sets: [{ scored: 11, conceded: 9 }] },
        { kind: "cards", yellow: 1, red: 0 },
        { kind: "external_rank", rank: 1 },
      ],
    },
    TimeValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["time"] },
        seconds: { $ref: "#/$defs/NonNegativeDecimal" },
      },
      required: ["kind", "seconds"],
    },
    NonNegativeDecimal: {
      type: "string",
      pattern: "^(0|[1-9][0-9]*)(\\.[0-9]+)?$",
    },
    DistanceValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["distance"] },
        metres: { $ref: "#/$defs/NonNegativeDecimal" },
      },
      required: ["kind", "metres"],
    },
    PointsValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["points"] },
        points: { $ref: "#/$defs/Decimal" },
      },
      required: ["kind", "points"],
    },
    Decimal: {
      type: "string",
      pattern: "^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$",
      description:
        "Số thập phân chính xác dạng chuỗi; độ chính xác/làm tròn do rule_snapshot_id quy định (U02).",
    },
    ScoreValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["score"] },
        scored: { type: "integer", minimum: 0, maximum: 9007199254740991 },
        conceded: { type: "integer", minimum: 0, maximum: 9007199254740991 },
      },
      required: ["kind", "scored", "conceded"],
    },
    SetsValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["sets"] },
        sets: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              scored: {
                type: "integer",
                minimum: 0,
                maximum: 9007199254740991,
              },
              conceded: {
                type: "integer",
                minimum: 0,
                maximum: 9007199254740991,
              },
            },
            required: ["scored", "conceded"],
          },
          minItems: 1,
        },
      },
      required: ["kind", "sets"],
    },
    CardsValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["cards"] },
        yellow: { type: "integer", minimum: 0, maximum: 9007199254740991 },
        red: { type: "integer", minimum: 0, maximum: 9007199254740991 },
      },
      required: ["kind", "yellow", "red"],
    },
    RankValue: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["external_rank"] },
        rank: { type: "integer", minimum: 1, maximum: 9007199254740991 },
      },
      required: ["kind", "rank"],
      description:
        "Vị thứ chính thức từ phần mềm Cờ vua bên ngoài; không tính lại ván/hệ số.",
      examples: [{ kind: "external_rank", rank: 1 }],
    },
    SyncReceipt: {
      type: "object",
      additionalProperties: false,
      properties: {
        operation_id: { type: "string", format: "uuid" },
        status: {
          type: "string",
          enum: ["accepted", "review_required", "conflict", "rejected"],
        },
        submission_id: {
          anyOf: [{ type: "string", format: "uuid" }, { type: "null" }],
        },
      },
      required: ["operation_id", "status", "submission_id"],
    },
  },
};
