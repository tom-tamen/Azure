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

const handler = require("../vote/index");
const { votes, getVoteByUserId } = require("../shared/cosmos");

describe("POST /vote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when payload is invalid", async () => {
    const context = createContext();

    await handler(context, { body: { userId: "", choice: "maybe" } });

    expect(context.res.status).toBe(400);
    expect(context.res.body.error).toContain("choice");
    expect(getVoteByUserId).not.toHaveBeenCalled();
    expect(votes.items.create).not.toHaveBeenCalled();
  });

  it("returns 409 when user already voted", async () => {
    const context = createContext();
    getVoteByUserId.mockResolvedValue({ id: "u1" });

    await handler(context, { body: { userId: "u1", choice: "yes" } });

    expect(getVoteByUserId).toHaveBeenCalledWith("u1");
    expect(context.res.status).toBe(409);
    expect(context.res.body.error).toContain("already");
    expect(votes.items.create).not.toHaveBeenCalled();
  });

  it("stores the vote and returns 201", async () => {
    const context = createContext();
    getVoteByUserId.mockResolvedValue(null);
    votes.items.create.mockResolvedValue({});

    const req = { body: { userId: "u1", choice: " YES " } };

    await handler(context, req);

    expect(votes.items.create).toHaveBeenCalledTimes(1);
    const voteDoc = votes.items.create.mock.calls[0][0];
    expect(voteDoc).toMatchObject({ userId: "u1", choice: "yes" });
    expect(voteDoc).toHaveProperty("id", "u1");
    expect(voteDoc).toHaveProperty("createdAt");
    expect(context.res.status).toBe(201);
    expect(context.res.body.vote).toMatchObject({ userId: "u1", choice: "yes" });
  });

  it("maps unexpected failures to HTTP 500", async () => {
    const context = createContext();
    getVoteByUserId.mockResolvedValue(null);
    votes.items.create.mockRejectedValue(new Error("write failed"));

    await handler(context, { body: { userId: "u1", choice: "no" } });

    expect(context.res.status).toBe(500);
    expect(context.res.body).toEqual({ error: "write failed" });
  });
});
