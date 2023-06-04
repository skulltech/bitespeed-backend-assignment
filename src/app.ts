import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import { FromSchema } from "json-schema-to-ts";

const prisma = new PrismaClient();
const app = Fastify({});

// Schema of POST body
const body = {
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
const reply = {
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

app.post<{ Body: FromSchema<typeof body>; Reply: FromSchema<typeof reply> }>(
  "/identify",
  {
    schema: {
      body,
      response: {
        200: reply,
      },
    },
  },
  async (request, reply) => {
    const { email, phoneNumber } = request.body;

    return {
      contact: {
        primaryContactId: 1,
        emails: [],
        phoneNumbers: [],
        secondaryContactIds: [],
      },
    };
  }
);

const main = async () => {
  try {
    await app.listen({ port: 3000 });

    const address = app.server.address();
    const port = typeof address === "string" ? address : address?.port;
    console.log("API server is listening @ port", port);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

main();
