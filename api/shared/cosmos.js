const { CosmosClient } = require("@azure/cosmos");

const connStr = process.env.COSMOS_CONN_STRING;
const dbName  = process.env.DB_NAME        || "bayroumeter";
const usersCt = process.env.USERS_CONTAINER|| "users";
const votesCt = process.env.VOTES_CONTAINER|| "votes";

if(!connStr) {
  throw new Error("COSMOS_CONN_STRING is not set");
}

const client   = new CosmosClient(connStr);
const database = client.database(dbName);
const users    = database.container(usersCt);
const votes    = database.container(votesCt);

module.exports = {
  users, votes,
  async getVoteByUserId(userId) {
    const q = {
      query: "SELECT TOP 1 * FROM c WHERE c.userId = @uid",
      parameters: [{ name: "@uid", value: userId }]
    };
    const { resources } = await votes.items.query(q).fetchAll();
    return resources?.[0] || null;
  }
};
