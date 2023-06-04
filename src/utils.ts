export const notEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

export const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
    },
  },
  production: true,
  test: false,
};

// Schema of POST body
export const body = {
  type: "object",
  properties: {
    email: {
      type: "string",
    },
    phoneNumber: {
      type: "string",
    },
  },
} as const;

// Schema of success response
export const reply = {
  type: "object",
  properties: {
    contact: {
      type: "object",
      properties: {
        primaryContactId: {
          type: "number",
        },
        emails: {
          type: "array",
          items: {
            type: "string",
          },
        },
        phoneNumbers: {
          type: "array",
          items: {
            type: "string",
          },
        },
        secondaryContactIds: {
          type: "array",
          items: {
            type: "number",
          },
        },
      },
      required: [
        "primaryContactId",
        "emails",
        "phoneNumbers",
        "secondaryContactIds",
      ],
    },
  },
  required: ["contact"],
} as const;
