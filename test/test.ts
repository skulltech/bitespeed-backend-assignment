import { describe } from "mocha";
import { PrismaClient } from "@prisma/client";
import { app } from "../src/app";
import { expect } from "chai";
import { FromSchema } from "json-schema-to-ts";
import { reply } from "../src/utils";

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

  it("creates secondary contact when given new information about existing customer", async () => {
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

  it("returns merged contacts when given common field", async () => {
    // Set up
    const primaryContact = await identify("lorraine@hillvalley.edu", "123456");
    await identify("mcfly@hillvalley.edu", "123456");

    const response = await identify(null, "123456");

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

  it("returns merged contacts when given non-common field of primary contact", async () => {
    // Set up
    const primaryContact = await identify("lorraine@hillvalley.edu", "123456");
    await identify("mcfly@hillvalley.edu", "123456");

    const response = await identify("lorraine@hillvalley.edu", null);

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

  it("returns merged contacts when given non-common field of secondary contact", async () => {
    // Set up
    const primaryContact = await identify("lorraine@hillvalley.edu", "123456");
    await identify("mcfly@hillvalley.edu", "123456");

    const response = await identify("mcfly@hillvalley.edu", null);

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

  it("converts primary contacts to secondary ones when they are merged", async () => {
    // Set up
    const primaryContact = await identify("george@hillvalley.edu", "919191");
    await identify("biffsucks@hillvalley.edu", "717171");

    const response = await identify("george@hillvalley.edu", "717171");

    expect(response.contact.primaryContactId).to.equal(
      primaryContact.contact.primaryContactId
    );
    expect(response.contact.emails).to.deep.equal([
      "george@hillvalley.edu",
      "biffsucks@hillvalley.edu",
    ]);
    expect(response.contact.phoneNumbers).to.deep.equal(["919191", "717171"]);
    expect(response.contact.secondaryContactIds.length).to.equal(1);
  });
});
