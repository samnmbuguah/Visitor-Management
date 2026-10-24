import { z } from "zod";

export const visitorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[\d\s\-()]{7,15}$/, "Invalid phone number"),
  company: z.string().max(100).optional().default(""),
  purpose: z.string().max(500).optional().default(""),
  host: z.number(),
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
  host: z.number(),
  location: z.number(),
  expected_arrival: z.string().min(1, "Expected arrival is required"),
  expected_duration: z.number().min(1).max(1440).optional().nullable(),
  purpose: z.string().max(500).optional().default(""),
  visitor_type: z.number().optional(),
});

export const watchlistSchema = z.object({
  name: z.string().max(255).optional().default(""),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(50).optional().default(""),
  reason: z.string().min(2, "Reason is required"),
  match_type: z.enum(["EXACT", "CONTAINS"]).optional().default("EXACT"),
  is_active: z.boolean().optional().default(true),
  location: z.number().optional().nullable(),
});

export const locationSchema = z.object({
  name: z.string().min(2, "Location name is required").max(100),
  address: z.string().max(500).optional().default(""),
  floor: z.string().max(50).optional().default(""),
  timezone: z.string().max(50).optional().default("UTC"),
  require_visitor_approval: z.boolean().optional().default(false),
  require_nda: z.boolean().optional().default(false),
  nda_content: z.string().max(5000).optional().default(""),
  is_active: z.boolean().optional().default(true),
});

export const kioskSchema = z.object({
  name: z.string().min(2, "Kiosk name is required").max(100),
  location: z.number(),
  is_active: z.boolean().optional().default(true),
});

export const notificationTemplateSchema = z.object({
  name: z.string().min(2, "Template name is required").max(100),
  type: z.enum([
    "VISITOR_ARRIVAL",
    "VISITOR_CHECKOUT",
    "PRE_REGISTRATION",
    "OVERSTAY_ALERT",
    "VISITOR_CONFIRMATION",
  ]),
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Template body is required"),
  is_active: z.boolean().optional().default(true),
  location: z.number().optional().nullable(),
});

export const tenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  subdomain: z.string().max(50).optional().default(""),
  billing_email: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "CANCELLED"]).optional().default("ACTIVE"),
  tier: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]).optional().default("STARTER"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { success: false, errors };
}
