// One-off: link existing deals to the project catalog and recompute stages (KEYS due = expected TOP).
import { buildStages, completedMap, currentStage } from '../src/server/domain/stages.js';
import { expectedTopDate, findProjectByName } from '../src/server/projects.js';
import { store } from '../src/server/store.js';

for (const deal of await store.listDeals()) {
    const project = findProjectByName(deal.project);
    deal.projectId = project?.id ?? null;
    deal.stages = buildStages(deal.otpDate, completedMap(deal.stages), expectedTopDate(project));
    deal.currentStage = currentStage(deal.stages)?.key ?? 'KEYS';
    await store.saveDeal(deal);
    console.log(deal.project, '->', deal.projectId);
}
