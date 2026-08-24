const record = (client, { institutionId, actorId, action, entity, entityId, metadata }) =>
  client.auditLog.create({
    data: {
      institutionId: institutionId || null,
      actorId: actorId || null,
      action,
      entity,
      entityId: entityId || null,
      metadata: metadata || undefined,
    },
  });

const actorOf = (ctx) => ctx?.user?.id || null;

module.exports = { record, actorOf };
