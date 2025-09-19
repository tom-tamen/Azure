const { votes, getVoteByUserId } = require("../shared/cosmos");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const userId = (body.userId || "").trim();
    const choice = (body.choice || "").trim().toLowerCase();

    if(!userId || !["yes","no"].includes(choice)){
      context.res = { status: 400, body: { error: "Provide 'userId' and 'choice' in ['yes','no']." } };
      return;
    }

    // Empêche le double vote
    const existing = await getVoteByUserId(userId);
    if(existing){
      context.res = { status: 409, body: { error: "User already voted." } };
      return;
    }

    const doc = { id: userId, userId, choice, createdAt: new Date().toISOString() };
    await votes.items.create(doc);

    context.res = { status: 201, body: { status: "saved", vote: doc } };
  } catch (e) {
    context.log.error("POST /vote error", e);
    context.res = { status: 500, body: { error: String(e.message || e) } };
  }
};
