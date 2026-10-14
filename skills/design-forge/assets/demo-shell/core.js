export function createDemoRuntime({ initialRoute, routes, onChange = () => {} }) {
  const state = { route: initialRoute, history: [initialRoute], visited: new Set([initialRoute]), log: [] };

  function notify(action, detail = "") {
    state.log.unshift({ action, detail, at: Date.now() });
    state.log = state.log.slice(0, 30);
    onChange(state);
  }

  function go(route) {
    if (!routes[route]) throw new Error(`Unknown route: ${route}`);
    state.route = route;
    state.history.push(route);
    state.visited.add(route);
    notify("NAV", route);
  }

  function back() {
    if (state.history.length <= 1) return;
    state.history.pop();
    state.route = state.history.at(-1);
    notify("BACK", state.route);
  }

  function reset() {
    state.route = initialRoute;
    state.history = [initialRoute];
    state.visited = new Set([initialRoute]);
    state.log = [];
    notify("RESET", initialRoute);
  }

  return { state, go, back, reset, log: notify };
}
