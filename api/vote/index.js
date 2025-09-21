const { votes, getVoteByUserId } = require("../shared/cosmos");
const { getClient } = require("../shared/telemetry");

module.exports = async function (context, req) {
  const ai = getClient();
  const opId = context.invocationId;
  const started = Date.now();

  try {
    const body = req.body || {};
    const userId = (body.userId || "").trim();
    const choice = (body.choice || "").trim().toLowerCase();

    ai.trackEvent({ name: "vote_submit_attempt", properties: { opId, userIdLen: userId.length, choice } });

    if (!userId || !["yes", "no"].includes(choice)) {
      ai.trackEvent({
        name: "vote_submit_validation_failed",
        properties: { opId, hasUserId: !!userId, choice }
      });
      context.res = { status: 400, body: { error: "Provide 'userId' and 'choice' in ['yes','no']." } };
      return;
    }

    // Anti double vote
    const tCheck = Date.now();
    const existing = await getVoteByUserId(userId);
    ai.trackMetric({ name: "cosmos_vote_check_ms", value: Date.now() - tCheck, properties: { opId } });

    if (existing) {
      ai.trackEvent({ name: "vote_duplicate", properties: { opId, userId } });
      context.res = { status: 409, body: { error: "User already voted." } };
      return;
    }

    // Enregistrement
    const doc = { id: userId, userId, choice, createdAt: new Date().toISOString() };
    const tInsert = Date.now();
    await votes.items.create(doc);
    ai.trackMetric({ name: "cosmos_vote_insert_ms", value: Date.now() - tInsert, properties: { opId } });

    ai.trackEvent({ name: "vote_saved", properties: { opId, userId, choice } });
    ai.trackMetric({ name: "vote_handler_duration_ms", value: Date.now() - started, properties: { opId } });

    context.res = { status: 201, body: { status: "saved", vote: doc } };
  } catch (e) {
    context.log.error("POST /vote error", e);
    getClient().trackException({ exception: e, properties: { opId, where: "vote_submit" } });
    context.res = { status: 500, body: { error: String(e.message || e) } };
  } finally {
    getClient().flush();
  }
};
