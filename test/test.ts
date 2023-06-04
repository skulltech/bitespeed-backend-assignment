import { describe } from "mocha";
import { PrismaClient } from "@prisma/client";
import { app, reply } from "../src/app";
import { expect } from "chai";
import { FromSchema } from "json-schema-to-ts";

const prisma = new PrismaClient();

const identify = async (
  email: string | null,
  phoneNumber: string | null
): Promise<FromSchema<typeof reply>> => {
  const response = await app
    .inject()
    .post("/identify")
    .payload({ email, phoneNumber })
    .end();

  expect(response.statusCode).to.equal(200);
  return response.json();
};

describe("Identify", () => {
  // Delete all rows before starting tests
  beforeEach(async () => {
    await prisma.contact.deleteMany();
  });

  it("creates contact for new customer", async () => {
    const response = await identify("lorraine@hillvalley.edu", "123456");

    expect(response.contact.emails).to.deep.equal(["lorraine@hillvalley.edu"]);
    expect(response.contact.phoneNumbers).to.deep.equal(["123456"]);
    expect(response.contact.secondaryContactIds).to.deep.equal([]);
  });

  it("merges two contacts when one field is common", async () => {
    const primaryContact = await identify("lorraine@hillvalley.edu", "123456");
    const response = await identify("mcfly@hillvalley.edu", "123456");

    expect(response.contact.primaryContactId).to.equal(
      primaryContact.contact.primaryContactId
    );
    expect(response.contact.emails).to.deep.equal([
      "lorraine@hillvalley.edu",
      "mcfly@hillvalley.edu",
    ]);
    expect(response.contact.phoneNumbers).to.deep.equal(["123456"]);
    expect(response.contact.secondaryContactIds.length).to.equal(1);
  });
});
