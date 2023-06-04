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
  // @ts-ignore
  async (request, reply) => {
    // TODO: handle case when both are undefined
    const { email, phoneNumber } = request.body;

    // Check if exists
    const contacts = await prisma.contact.findMany({
      where: {
        // Either email or phoneNumber matches
        OR: [{ email }, { phoneNumber }],
      },
    });

    if (!contacts.length) {
      // Create contact
      const contact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
        },
      });
      return {
        contact: {
          primaryContactId: contact.id,
          emails: contact.email ? [contact.email] : [],
          phoneNumbers: contact.phoneNumber ? [contact.phoneNumber] : [],
          secondaryContactIds: [],
        },
      };
    }

    return {
      contact: {
        primaryContactId: contacts[0].id,
        emails: contacts.filter((x) => x.email).map((x) => x.email),
        phoneNumbers: contacts
          .filter((x) => x.phoneNumber)
          .map((x) => x.phoneNumber),
        secondaryContactIds: contacts.slice(1).map((x) => x.id),
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
