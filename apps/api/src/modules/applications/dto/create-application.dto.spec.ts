import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateApplicationDto } from "./create-application.dto";

describe("CreateApplicationDto", () => {
  it("validates required fields", async () => {
    const dto = plainToInstance(CreateApplicationDto, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((item) => item.property === "companyName")).toBe(true);
    expect(errors.some((item) => item.property === "jobTitle")).toBe(true);
    expect(errors.some((item) => item.property === "applicationDate")).toBe(true);
    expect(errors.some((item) => item.property === "status")).toBe(true);
  });

  it("accepts valid payload", async () => {
    const dto = plainToInstance(CreateApplicationDto, {
      companyName: "Acme",
      jobTitle: "Frontend Engineer",
      applicationDate: new Date().toISOString(),
      status: "Applied"
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
