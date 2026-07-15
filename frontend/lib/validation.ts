import { z } from "zod";

export const visitorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,15}$/, "Invalid phone number"),
  company: z.string().max(100).optional().default(""),
  purpose: z.string().max(500).optional().default(""),
  host: z.number({ required_error: "Host is required" }),
  location: z.number().optional(),
  visitor_type: z.number().optional(),
  expected_duration: z.number().min(1).max(1440).optional().nullable(),
  photo: z.string().optional().default(""),
  nda_accepted: z.boolean().optional().default(false),
  signature: z.string().optional().default(""),
  number_plate: z.string().max(20).optional().default(""),
});

export const preRegistrationSchema = z.object({
  visitor_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  visitor_email: z.string().email("Invalid email address"),
  visitor_phone: z.string().regex(/^\+?[\d\s\-()]{7,15}$/, "Invalid phone number").optional().default(""),
  visitor_company: z.string().max(100).optional().default(""),
  host: z.number({ required_error: "Host is required" }),
  location: z.number({ required_error: "Location is required" }),
  expected_arrival: z.string().min(1, "Expected arrival is required"),
  expected_duration: z.number().min(1).max(1440).optional().nullable(),
  purpose: z.string().max(500).optional().default(""),
  visitor_type: z.number().optional(),
});

export const leaseSchema = z.object({
  unit_number: z.string().min(1, "Unit number is required").max(50),
  tenant: z.number({ required_error: "Tenant is required" }),
  monthly_rent: z.number().positive("Rent must be positive"),
  deposit: z.number().min(0).optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  status: z.enum(["ACTIVE", "EXPIRING", "EXPIRED", "TERMINATED"]).optional().default("ACTIVE"),
  terms: z.string().max(2000).optional().default(""),
});

export const maintenanceRequestSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]),
  location: z.number({ required_error: "Location is required" }),
  category: z.number({ required_error: "Category is required" }),
  assigned_to: z.number().optional(),
});

export const assetSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  asset_type: z.number({ required_error: "Asset type is required" }),
  location: z.number({ required_error: "Location is required" }),
  serial_number: z.string().max(100).optional().default(""),
  purchase_date: z.string().optional(),
  purchase_cost: z.number().min(0).optional(),
  warranties: z.string().max(500).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
  status: z.enum(["OPERATIONAL", "UNDER_MAINTENANCE", "RETIRED", "LOST"]).optional().default("OPERATIONAL"),
});

export const tenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,15}$/, "Invalid phone number").optional().or(z.literal("")),
  company: z.string().max(100).optional().default(""),
  unit: z.string().max(50).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  monthly_rent: z.number().min(0).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { success: false, errors };
}

export type ValidationErrors = Record<string, string>;
