import { MINI_APP_IDS, getModule } from './modules';

// Derives {routeName: moduleId} straight from the existing module registry
// instead of a hand-maintained duplicate list — adding a new mini-app to
// modules.ts automatically gets contextual news coverage here too. Walks
// each module's route.params chain (e.g. {name:'Main', params:{screen:'Life',
// params:{screen:'TravelHome'}}}) down to the innermost `screen` name, since
// that's the actual registered route name a navigation state listener sees.
function innermostRouteName(route: { name: string; params?: any }): string {
  let current = route;
  while (current.params && typeof current.params === 'object' && typeof current.params.screen === 'string') {
    current = { name: current.params.screen, params: current.params.params };
  }
  return current.name;
}

export const MINI_APP_ROUTE_TO_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const id of MINI_APP_IDS) {
    const module = getModule(id);
    if (module?.route) {
      map[innermostRouteName(module.route)] = id;
    }
  }
  return map;
})();

export function miniAppIdForRoute(routeName: string | undefined): string | null {
  if (!routeName) return null;
  return MINI_APP_ROUTE_TO_ID[routeName] ?? null;
}
