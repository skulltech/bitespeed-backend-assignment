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

    // No existing rows, create primary contact
    if (!contacts.length) {
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

    const primaryContact = contacts[0];
    const secondaryContacts = contacts.slice(1);
    const emails = contacts.map((x) => x.email).filter((x) => x);
    const phoneNumbers = contacts.map((x) => x.phoneNumber).filter((x) => x);

    // Merge contacts if necessary
    if (secondaryContacts.find((x) => x.linkPrecedence == "primary")) {
      await prisma.contact.updateMany({
        where: {
          id: { in: secondaryContacts.map((x) => x.id) },
        },
        data: {
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });
    }

    // Check if payload contains new information
    const emailIsNew = email && !emails.includes(email);
    const phoneNumberIsNew = phoneNumber && !phoneNumbers.includes(phoneNumber);
    if (emailIsNew || phoneNumberIsNew) {
      // Create a new secondary contact
      const contact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
        },
      });
      return {
        contact: {
          primaryContactId: primaryContact.id,
          emails: emailIsNew ? [...emails, email] : emails,
          phoneNumbers: phoneNumberIsNew
            ? [...phoneNumbers, phoneNumber]
            : phoneNumbers,
          secondaryContactIds: [
            ...contacts.slice(1).map((x) => x.id),
            contact.id,
          ],
        },
      };
    }

    return {
      contact: {
        primaryContactId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryContacts.map((x) => x.id),
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
