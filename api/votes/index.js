const { votes } = require("../shared/cosmos");

module.exports = async function (context, req) {
  try {
    const { resources } = await votes.items
      .query("SELECT c.id, c.userId, c.choice, c.createdAt FROM c")
      .fetchAll();

    const yes = resources.filter(r => r.choice === "yes").length;
    const no  = resources.filter(r => r.choice === "no").length;

    context.res = { status: 200, body: { items: resources, stats: { yes, no, total: resources.length } } };
  } catch (e) {
    context.log.error("GET /votes error", e);
    context.res = { status: 500, body: { error: String(e.message || e) } };
  }
};
