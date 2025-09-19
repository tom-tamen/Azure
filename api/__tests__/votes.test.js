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

const handler = require("../votes/index");
const { votes } = require("../shared/cosmos");

describe("GET /votes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns votes and aggregated stats", async () => {
    const context = createContext();
    const resources = [
      { id: "1", userId: "u1", choice: "yes", createdAt: "2023-01-01" },
      { id: "2", userId: "u2", choice: "no", createdAt: "2023-01-02" },
      { id: "3", userId: "u3", choice: "yes", createdAt: "2023-01-03" }
    ];
    const fetchAllMock = jest.fn().mockResolvedValue({ resources });
    votes.items.query.mockReturnValue({ fetchAll: fetchAllMock });

    await handler(context, {});

    expect(votes.items.query).toHaveBeenCalledTimes(1);
    expect(fetchAllMock).toHaveBeenCalledTimes(1);
    expect(context.res.status).toBe(200);
    expect(context.res.body.items).toEqual(resources);
    expect(context.res.body.stats).toEqual({ yes: 2, no: 1, total: 3 });
  });

  it("maps unexpected failures to HTTP 500", async () => {
    const context = createContext();
    const fetchAllMock = jest.fn().mockRejectedValue(new Error("query failed"));
    votes.items.query.mockReturnValue({ fetchAll: fetchAllMock });

    await handler(context, {});

    expect(context.res.status).toBe(500);
    expect(context.res.body).toEqual({ error: "query failed" });
  });
});
