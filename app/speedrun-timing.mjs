export const TIMING_METHODS = [
  "realtime",
  "realtime_noloads",
  "ingame",
];

const METHOD_PRIORITY = new Map(
  TIMING_METHODS.map((method, index) => [method, index]),
);

export function timingSeconds(times, method) {
  if (!times || !method) return null;
  const key = method === "primary" ? "primary_t" : `${method}_t`;
  const seconds = Number(times[key]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function chooseTimingMethod(runs, requestedDefault) {
  const defaultMethod = TIMING_METHODS.includes(requestedDefault)
    ? requestedDefault
    : null;
  if (
    defaultMethod &&
    runs.some((run) => timingSeconds(run.timings, defaultMethod) !== null)
  ) {
    return defaultMethod;
  }

  const latestTimes = runs.at(-1)?.timings;
  const candidates = TIMING_METHODS.filter(
    (method) => timingSeconds(latestTimes, method) !== null,
  );

  if (!candidates.length) return "primary";

  const coverage = new Map(
    candidates.map((method) => [
      method,
      runs.filter((run) => timingSeconds(run.timings, method) !== null).length,
    ]),
  );
  const latestPrimary = timingSeconds(latestTimes, "primary");

  return candidates.sort((left, right) => {
    const coverageOrder = coverage.get(right) - coverage.get(left);
    if (coverageOrder) return coverageOrder;

    const primaryOrder =
      Number(timingSeconds(latestTimes, right) === latestPrimary) -
      Number(timingSeconds(latestTimes, left) === latestPrimary);
    if (primaryOrder) return primaryOrder;

    return METHOD_PRIORITY.get(left) - METHOD_PRIORITY.get(right);
  })[0];
}
