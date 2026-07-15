import { describe, it, expect } from "vitest";
import {
  visitorSchema,
  loginSchema,
  leaseSchema,
  maintenanceRequestSchema,
  assetSchema,
  tenantSchema,
  validate,
} from "@/lib/validation";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ username: "admin", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = loginSchema.safeParse({ username: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ username: "admin", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("visitorSchema", () => {
  it("accepts valid visitor", () => {
    const result = visitorSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      host: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = visitorSchema.safeParse({
      name: "J",
      email: "john@example.com",
      phone: "+1234567890",
      host: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = visitorSchema.safeParse({
      name: "John Doe",
      email: "not-an-email",
      phone: "+1234567890",
      host: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone", () => {
    const result = visitorSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      phone: "abc",
      host: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("leaseSchema", () => {
  it("accepts valid lease", () => {
    const result = leaseSchema.safeParse({
      unit_number: "A101",
      tenant: 1,
      monthly_rent: 1500,
      start_date: "2026-01-01",
      end_date: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative rent", () => {
    const result = leaseSchema.safeParse({
      unit_number: "A101",
      tenant: 1,
      monthly_rent: -100,
      start_date: "2026-01-01",
      end_date: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("maintenanceRequestSchema", () => {
  it("accepts valid request", () => {
    const result = maintenanceRequestSchema.safeParse({
      title: "Leaky faucet",
      description: "The kitchen faucet has been leaking for 3 days",
      priority: "HIGH",
      location: 1,
      category: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects short description", () => {
    const result = maintenanceRequestSchema.safeParse({
      title: "Leak",
      description: "Too short",
      priority: "LOW",
      location: 1,
      category: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("validate helper", () => {
  it("returns parsed data on success", () => {
    const result = validate(loginSchema, { username: "admin", password: "pass" });
    expect(result.success).toBe(true);
    expect(result.data?.username).toBe("admin");
  });

  it("returns field-level errors on failure", () => {
    const result = validate(loginSchema, { username: "", password: "" });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.username).toBeDefined();
    expect(result.errors?.password).toBeDefined();
  });
});
