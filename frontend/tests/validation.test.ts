import { describe, it, expect } from "vitest";
import {
  visitorSchema,
  preRegistrationSchema,
  watchlistSchema,
  locationSchema,
  loginSchema,
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

describe("preRegistrationSchema", () => {
  it("accepts valid invite", () => {
    const result = preRegistrationSchema.safeParse({
      visitor_name: "Jane Smith",
      visitor_email: "jane@company.com",
      host: 1,
      location: 1,
      expected_arrival: "2026-10-25T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing arrival", () => {
    const result = preRegistrationSchema.safeParse({
      visitor_name: "Jane Smith",
      visitor_email: "jane@company.com",
      host: 1,
      location: 1,
      expected_arrival: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("watchlistSchema", () => {
  it("accepts valid watchlist entry", () => {
    const result = watchlistSchema.safeParse({
      name: "Restricted Individual",
      email: "banned@example.com",
      reason: "Security risk",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing reason", () => {
    const result = watchlistSchema.safeParse({
      name: "Restricted Individual",
      reason: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("locationSchema", () => {
  it("accepts valid location", () => {
    const result = locationSchema.safeParse({
      name: "Headquarters",
      address: "100 Main St",
      floor: "3rd Floor",
    });
    expect(result.success).toBe(true);
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
