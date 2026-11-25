const EventEmitter = require("events");
const appEvents = new EventEmitter();

appEvents.on("user:registered", ({ userId, email }) =>
  console.log(`[EVENT] user:registered id=${userId} email=${email}`)
);
appEvents.on("note:created", ({ noteId, owner }) =>
  console.log(`[EVENT] note:created id=${noteId} owner=${owner}`)
);
appEvents.on("chat:message", ({ username, room }) =>
  console.log(`[EVENT] chat:message user=${username} room=${room}`)
);

module.exports = appEvents;
