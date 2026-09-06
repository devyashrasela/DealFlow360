import { ActivityEvent } from './src/models/index.js';
(async () => {
  const events = await ActivityEvent.findAll({ limit: 10, order: [['created_at', 'DESC']] });
  console.log(events.map(e => ({ id: e.id, title: e.title, severity: e.severity, entity_type: e.entity_type, event_type: e.event_type })));
  process.exit(0);
})();
