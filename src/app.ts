import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import { FromSchema } from "json-schema-to-ts";
import "dotenv/config";
import { notEmpty, envToLogger, body, reply } from "./utils";

const prisma = new PrismaClient();

export const app = Fastify({
  // @ts-ignore
  logger: envToLogger[process.env.NODE_ENV] ?? true,
});

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
    // Sanity check: make sure either email or phoneNumber exists
    if (!email && !phoneNumber) return reply.code(400).send();

    // Get contacts with matching email// phoneNumber
    const matchingContacts = await prisma.contact.findMany({
      where: {
        // Either email or phoneNumber matches
        OR: [{ email }, { phoneNumber }],
      },
    });

    // No existing rows, create primary contact
    if (!matchingContacts.length) {
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

    // Fetch contacts linked to the matching ones
    const linkedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          {
            linkPrecedence: "primary",
            id: {
              in: matchingContacts
                .filter((x) => x.linkPrecedence == "secondary")
                .map((x) => x.linkedId)
                .filter(notEmpty),
            },
          },
          {
            linkPrecedence: "secondary",
            linkedId: {
              in: matchingContacts
                .filter((x) => x.linkPrecedence == "primary")
                .map((x) => x.id),
            },
          },
        ],
        id: {
          not: {
            in: matchingContacts.map((x) => x.id),
          },
        },
      },
    });

    // Consolidate data
    const contacts = [...matchingContacts, ...linkedContacts].sort(
      (a, b) => a.id - b.id
    );

    const primaryContact = contacts[0];
    const secondaryContacts = contacts.slice(1);

    const emails = [...new Set(contacts.map((x) => x.email).filter(notEmpty))];
    const phoneNumbers = [
      ...new Set(contacts.map((x) => x.phoneNumber).filter(notEmpty)),
    ];

    // If necessary, merge primary contacts and make the newer ones secondary
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
