const { createContext } = require("./test-utils");

jest.mock("../shared/cosmos", () => {
  const usersItems = {
    query: jest.fn(),
    create: jest.fn()
  };
  const votesItems = {
    query: jest.fn(),
    create: jest.fn()
  };

  return {
    users: { items: usersItems },
    votes: { items: votesItems },
    getVoteByUserId: jest.fn()
  };
});

const handler = require("../user/index");
const { users } = require("../shared/cosmos");

describe("POST /user", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when pseudo or email is missing", async () => {
    const context = createContext();

    await handler(context, { body: { pseudo: "" } });

    expect(context.res).toEqual({
      status: 400,
      body: { error: "Fields 'pseudo' and 'email' are required." }
    });
    expect(users.items.query).not.toHaveBeenCalled();
  });

  it("returns 409 when email already exists", async () => {
    const context = createContext();
    const fetchAllMock = jest.fn().mockResolvedValue({ resources: [{ id: "abc" }] });
    users.items.query.mockReturnValue({ fetchAll: fetchAllMock });

    await handler(context, { body: { pseudo: "User", email: "user@example.com" } });

    expect(users.items.query).toHaveBeenCalledTimes(1);
    expect(fetchAllMock).toHaveBeenCalledTimes(1);
    expect(context.res.status).toBe(409);
    expect(context.res.body.error).toContain("utilisateur");
    expect(users.items.create).not.toHaveBeenCalled();
  });

  it("persists a trimmed user and returns 201", async () => {
    const context = createContext();
    const fetchAllMock = jest.fn().mockResolvedValue({ resources: [] });
    users.items.query.mockReturnValue({ fetchAll: fetchAllMock });
    users.items.create.mockResolvedValue({});

    const req = { body: { pseudo: "  User  ", email: "USER@Example.com " } };

    await handler(context, req);

    expect(users.items.create).toHaveBeenCalledTimes(1);
    const created = users.items.create.mock.calls[0][0];
    expect(created).toMatchObject({
      pseudo: "User",
      email: "user@example.com"
    });
    expect(created).toHaveProperty("id");
    expect(created).toHaveProperty("createdAt");
    expect(context.res.status).toBe(201);
    expect(context.res.body).toMatchObject({
      pseudo: "User",
      email: "user@example.com"
    });
  });

  it("maps unexpected failures to HTTP 500", async () => {
    const context = createContext();
    const fetchAllMock = jest.fn().mockResolvedValue({ resources: [] });
    users.items.query.mockReturnValue({ fetchAll: fetchAllMock });
    users.items.create.mockRejectedValue(new Error("db down"));

    await handler(context, { body: { pseudo: "User", email: "user@example.com" } });

    expect(context.res.status).toBe(500);
    expect(context.res.body).toEqual({ error: "db down" });
  });
});
