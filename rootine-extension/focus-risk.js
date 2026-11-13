(function (root) {
  "use strict";

  const RISK_INTERVAL_MS = 6 * 60 * 1000;
  const RISK_INCREMENT = 1;
  const RISK_ROLL_STEPS = 5;

  function createHealthState() {
    return {
      riskPercent: 0,
      isDead: false,
      unfocusedSince: null,
      lastRiskAt: null,
      riskEvents: 0,
      stepsSinceRoll: 0,
    };
  }

  function normalizeHealthState(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      riskPercent: Math.min(100, Math.max(0, Number(source.riskPercent) || 0)),
      isDead: Boolean(source.isDead),
      unfocusedSince: Number(source.unfocusedSince) || null,
      lastRiskAt: Number(source.lastRiskAt) || null,
      riskEvents: Math.max(0, Number(source.riskEvents) || 0),
      stepsSinceRoll: Math.min(
        RISK_ROLL_STEPS - 1,
        Math.max(0, Number(source.stepsSinceRoll) || 0),
      ),
    };
  }

  function beginDistraction(value, now) {
    const health = normalizeHealthState(value);
    if (health.isDead || health.unfocusedSince) return health;
    return {
      ...health,
      unfocusedSince: now,
      lastRiskAt: now,
    };
  }

  function endDistraction(value) {
    const health = normalizeHealthState(value);
    return {
      ...health,
      unfocusedSince: null,
      lastRiskAt: null,
      stepsSinceRoll: 0,
    };
  }

  function applyElapsedRisk(value, now, randomValue) {
    const health = normalizeHealthState(value);
    if (health.isDead || !health.unfocusedSince || !health.lastRiskAt) {
      return { health, intervalsApplied: 0, diedNow: false };
    }

    const intervals = Math.floor((now - health.lastRiskAt) / RISK_INTERVAL_MS);
    if (intervals <= 0) {
      return { health, intervalsApplied: 0, diedNow: false };
    }

    let intervalsApplied = 0;
    let diedNow = false;
    let riskPercent = health.riskPercent;
    let riskEvents = health.riskEvents;
    let stepsSinceRoll = health.stepsSinceRoll;
    const roll = typeof randomValue === "function" ? randomValue : Math.random;

    while (intervalsApplied < intervals && !diedNow) {
      riskPercent = Math.min(100, riskPercent + RISK_INCREMENT);
      intervalsApplied += 1;
      stepsSinceRoll += 1;

      if (stepsSinceRoll === RISK_ROLL_STEPS) {
        riskEvents += 1;
        stepsSinceRoll = 0;
        diedNow = roll() < riskPercent / 100;
      }
    }

    return {
      health: {
        ...health,
        riskPercent,
        isDead: diedNow,
        lastRiskAt: health.lastRiskAt + intervalsApplied * RISK_INTERVAL_MS,
        riskEvents,
        stepsSinceRoll,
      },
      intervalsApplied,
      diedNow,
    };
  }

  function minutesUntilRisk(value, now) {
    const deadline = nextRiskAt(value);
    if (!deadline) return null;
    const remaining = Math.max(0, deadline - now);
    return Math.ceil(remaining / 60000);
  }

  function minutesUntilRoll(value, now) {
    const deadline = nextRollAt(value);
    if (!deadline) return null;
    return Math.ceil(Math.max(0, deadline - now) / 60000);
  }

  function nextRiskAt(value) {
    const health = normalizeHealthState(value);
    return health.lastRiskAt && !health.isDead
      ? health.lastRiskAt + RISK_INTERVAL_MS
      : null;
  }

  function nextRollAt(value) {
    const health = normalizeHealthState(value);
    if (!health.lastRiskAt || health.isDead) return null;
    const stepsRemaining = RISK_ROLL_STEPS - health.stepsSinceRoll;
    return health.lastRiskAt + stepsRemaining * RISK_INTERVAL_MS;
  }

  const api = {
    RISK_INCREMENT,
    RISK_INTERVAL_MS,
    RISK_ROLL_STEPS,
    applyElapsedRisk,
    beginDistraction,
    createHealthState,
    endDistraction,
    minutesUntilRisk,
    minutesUntilRoll,
    nextRiskAt,
    nextRollAt,
    normalizeHealthState,
  };

  root.RootineFocusRisk = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
