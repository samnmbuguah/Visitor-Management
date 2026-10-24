import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthAPI, VisitorsAPI, InvitesAPI, LocationsAPI, HostsAPI } from "@/services/api";

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

describe("VisitorsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getVisitors calls /visitors/", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: "Alice" }] } });
    const result = await VisitorsAPI.getVisitors();
    expect(mockGet).toHaveBeenCalledWith("/visitors/", { params: undefined });
    expect(result).toHaveLength(1);
  });

  it("createVisitor posts to /visitors/", async () => {
    mockPost.mockResolvedValue({ data: { id: 1, name: "Bob" } });
    const result = await VisitorsAPI.createVisitor({ name: "Bob" });
    expect(mockPost).toHaveBeenCalledWith("/visitors/", { name: "Bob" });
    expect(result.name).toBe("Bob");
  });

  it("checkInVisitor posts to /visitors/1/checkin/", async () => {
    mockPost.mockResolvedValue({ data: { status: "CHECKED_IN" } });
    const result = await VisitorsAPI.checkInVisitor(1);
    expect(mockPost).toHaveBeenCalledWith("/visitors/1/checkin/");
    expect(result.status).toBe("CHECKED_IN");
  });

  it("approveVisitor posts to /visitors/1/approve/", async () => {
    mockPost.mockResolvedValue({ data: { status: "CHECKED_IN" } });
    const result = await VisitorsAPI.approveVisitor(1);
    expect(mockPost).toHaveBeenCalledWith("/visitors/1/approve/");
    expect(result.status).toBe("CHECKED_IN");
  });
});

describe("InvitesAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getInvites calls /pre-registrations/", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, visitor_name: "Charlie" }] } });
    const result = await InvitesAPI.getInvites();
    expect(mockGet).toHaveBeenCalledWith("/pre-registrations/", { params: undefined });
    expect(result).toHaveLength(1);
  });

  it("scanInviteToken posts to /pre-registrations/scan/", async () => {
    mockPost.mockResolvedValue({ data: { valid: true } });
    const result = await InvitesAPI.scanInviteToken("test-token");
    expect(mockPost).toHaveBeenCalledWith("/pre-registrations/scan/", { token: "test-token" });
    expect(result.valid).toBe(true);
  });
});

describe("LocationsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getLocations returns results", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: "Main Office" }] } });
    const result = await LocationsAPI.getLocations();
    expect(mockGet).toHaveBeenCalledWith("/locations/", { params: undefined });
    expect(result).toHaveLength(1);
  });
});

describe("HostsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getHosts returns results", async () => {
    mockGet.mockResolvedValue({ data: { results: [{ id: 1, name: "John Host" }] } });
    const result = await HostsAPI.getHosts();
    expect(mockGet).toHaveBeenCalledWith("/hosts/", { params: undefined });
    expect(result).toHaveLength(1);
  });
});
