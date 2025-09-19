const { users } = require("../shared/cosmos");
const { v4: uuidv4 } = require("uuid");

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const pseudo = (body.pseudo || "").trim();
    const email  = (body.email  || "").trim().toLowerCase();

    if(!pseudo || !email){
      context.res = { status: 400, body: { error: "Fields 'pseudo' and 'email' are required." } };
      return;
    }

    const id = uuidv4();
    const item = { id, pseudo, email, createdAt: new Date().toISOString() };
    await users.items.create(item);

    context.res = { status: 201, body: item };
  } catch (e) {
    context.log.error("POST /user error", e);
    context.res = { status: 500, body: { error: String(e.message || e) } };
  }
};
