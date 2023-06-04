import { describe } from "mocha";
import { app } from "../src/app";

describe("Identify", () => {
  it("Creates a contact", async () => {
    const response = await app
      .inject()
      .post("/identify")
      .payload({
        email: "lorraine@hillvalley.edu",
        phoneNumber: "123456",
      })
      .end();
  });
});
