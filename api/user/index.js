const { users } = require("../shared/cosmos");
const { v4: uuidv4 } = require("uuid");
const { getClient } = require("../shared/telemetry");

module.exports = async function (context, req) {
  const ai = getClient();
  const opId = context.invocationId;
  const started = Date.now();

  try {
    const body = req.body || {};
    const pseudo = (body.pseudo || "").trim();
    const email  = (body.email  || "").trim().toLowerCase();

    // Tentative
    ai.trackEvent({
      name: "user_create_attempt",
      properties: { opId, pseudoLen: pseudo.length, emailDomain: email.split("@")[1] || "n/a" }
    });

    if (!pseudo || !email) {
      ai.trackEvent({
        name: "user_create_validation_failed",
        properties: { opId, reason: "missing_fields", hasPseudo: !!pseudo, hasEmail: !!email }
      });
      context.res = {
        status: 400,
        body: { error: "Fields 'pseudo' and 'email' are required." }
      };
      return;
    }

    // Vérif existence
    const t1 = Date.now();
    const { resources: existing } = await users.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: email }]
      })
      .fetchAll();
    ai.trackMetric({ name: "cosmos_user_query_ms", value: Date.now() - t1, properties: { opId } });

    if (existing.length > 0) {
      ai.trackEvent({
        name: "user_create_conflict",
        properties: { opId, emailDomain: email.split("@")[1] || "n/a" }
      });
      context.res = {
        status: 409,
        body: { error: "Un utilisateur avec cet email existe déjà." }
      };
      return;
    }

    // Création
    const id = uuidv4();
    const item = { id, pseudo, email, createdAt: new Date().toISOString() };
    const t2 = Date.now();
    await users.items.create(item);
    ai.trackMetric({ name: "cosmos_user_insert_ms", value: Date.now() - t2, properties: { opId } });

    ai.trackEvent({
      name: "user_created",
      properties: { opId, userId: id, emailDomain: email.split("@")[1] || "n/a" }
    });
    ai.trackMetric({ name: "user_create_duration_ms", value: Date.now() - started, properties: { opId } });

    context.res = { status: 201, body: item };
  } catch (e) {
    context.log.error("POST /user error", e);
    getClient().trackException({ exception: e, properties: { opId, where: "user_create" } });
    context.res = { status: 500, body: { error: String(e.message || e) } };
  } finally {
    // vide le buffer avant fin d'exécution
    getClient().flush();
  }
};
