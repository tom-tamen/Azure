const { users } = require("../shared/cosmos");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const pseudo = (body.pseudo || "").trim();
    const email  = (body.email  || "").trim().toLowerCase();

    if (!pseudo || !email) {
      context.res = {
        status: 400,
        body: { error: "Fields 'pseudo' and 'email' are required." }
      };
      return;
    }

    // Vérification de l'existence d'un utilisateur avec cet email
    const { resources: existing } = await users.items
      .query({
        query: "SELECT * FROM c WHERE c.email = @email",
        parameters: [{ name: "@email", value: email }]
      })
      .fetchAll();

    if (existing.length > 0) {
      context.res = {
        status: 409,
        body: { error: "Un utilisateur avec cet email existe déjà." }
      };
      return;
    }

    const id = uuidv4();
    const item = { id, pseudo, email, createdAt: new Date().toISOString() };
    await users.items.create(item);

    context.res = { status: 201, body: item };
  } catch (e) {
    context.log.error("POST /user error", e);
    context.res = {
      status: 500,
      body: { error: String(e.message || e) }
    };
  }
};
