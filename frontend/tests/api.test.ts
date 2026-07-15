import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthAPI, PropertyManagementAPI, VisitorsAPI } from "@/services/api";

vi.mock("@/lib/api", () => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();

  return {
    default: {
      post: mockPost,
      get: mockGet,
      patch: mockPatch,
      delete: mockDelete,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
    __mockPost: mockPost,
    __mockGet: mockGet,
    __mockPatch: mockPatch,
    __mockDelete: mockDelete,
  };
});

const api = await import("@/lib/api");
const mockPost = (api as any).__mockPost;
const mockGet = (api as any).__mockGet;

describe("AuthAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login posts to /auth/login/", async () => {
    mockPost.mockResolvedValue({ data: { access: "token", refresh: "refresh" } });
    const result = await AuthAPI.login("admin", "pass");
    expect(mockPost).toHaveBeenCalledWith("/auth/login/", { username: "admin", password: "pass" });
    expect(result.access).toBe("token");
  });

  it("logout posts to /auth/logout/", async () => {
    mockPost.mockResolvedValue({ data: { detail: "logged out" } });
    await AuthAPI.logout("refresh-token");
    expect(mockPost).toHaveBeenCalledWith("/auth/logout/", { refresh: "refresh-token" });
  });

  it("getProfile calls /auth/me/", async () => {
    mockGet.mockResolvedValue({ data: { user: { username: "admin" } } });
    const result = await AuthAPI.getProfile();
    expect(mockGet).toHaveBeenCalledWith("/auth/me/");
    expect(result.user.username).toBe("admin");
  });
});

describe("PropertyManagementAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMaintenanceRequests calls with params", async () => {
    mockGet.mockResolvedValue({ data: { results: [] } });
    await PropertyManagementAPI.getMaintenanceRequests({ status: "OPEN" });
    expect(mockGet).toHaveBeenCalledWith("/property-management/requests/", { params: { status: "OPEN" } });
  });

  it("getAssets returns results or data", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1 }] } });
    const result = await PropertyManagementAPI.getAssets();
    expect(result).toEqual([{ id: 1 }]);
  });

  it("getLeases returns results", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, unit_number: "A1" }] } });
    const result = await PropertyManagementAPI.getLeases();
    expect(result).toHaveLength(1);
  });
});

describe("VisitorsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getLocations returns results", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: "Main Office" }] } });
    const result = await VisitorsAPI.getLocations();
    expect(result).toHaveLength(1);
  });

  it("getHosts returns results", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: "John" }] } });
    const result = await VisitorsAPI.getHosts();
    expect(result).toHaveLength(1);
  });
});
