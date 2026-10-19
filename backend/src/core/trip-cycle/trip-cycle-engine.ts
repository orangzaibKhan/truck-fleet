import type { GpsPing } from '../telemetry/telemetry-source';

/**
 * 'idle' covers any dwell that isn't part of the loading/dumping cycle,
 * including what would be reported as a breakdown by a driver - there is no
 * driver app in this prototype (M3 deferred by /plan-ceo-review), so
 * breakdown can only be inferred as "stopped too long," never confirmed.
 */
export type TripStage = 'loading' | 'loaded_travel' | 'dumping' | 'empty_travel' | 'idle' | 'signal_lost';

export interface StageSegment {
  stage: TripStage;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface ShiftAnalysis {
  segments: StageSegment[];
  tripsCount: number;
  avgCycleTimeMinutes: number | null;
  workingHours: number;
  availableHours: number;
  utilizationPct: number;
  totalDistanceKm: number;
}

export interface TripCycleOptions {
  /** Below this speed, the truck is dwelling, not traveling. */
  movingSpeedThresholdKph?: number;
  /** A dwell longer than this is 'idle', not loading/dumping - the cycle doesn't advance. */
  maxDwellMinutes?: number;
  /** A gap between consecutive pings longer than this is 'signal_lost' (Review Decisions #5). */
  signalLostGapSeconds?: number;
}

const DEFAULTS: Required<TripCycleOptions> = {
  movingSpeedThresholdKph: 5,
  maxDwellMinutes: 20,
  signalLostGapSeconds: 180,
};

const CYCLE_STAGES = new Set<TripStage>(['loading', 'loaded_travel', 'dumping', 'empty_travel']);

function minutesBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

function isMoving(p: GpsPing, thresholdKph: number): boolean {
  return p.speedKph >= thresholdKph;
}

/** Splits pings into contiguous chunks with no internal gap exceeding the threshold. */
function splitByGaps(
  pings: GpsPing[],
  gapThresholdSeconds: number,
): { chunk: GpsPing[]; gapBefore: StageSegment | null }[] {
  const chunks: { chunk: GpsPing[]; gapBefore: StageSegment | null }[] = [];
  let current: GpsPing[] = [pings[0]];
  let gapBefore: StageSegment | null = null;

  for (let i = 1; i < pings.length; i++) {
    const gapSeconds = (new Date(pings[i].timestamp).getTime() - new Date(pings[i - 1].timestamp).getTime()) / 1000;
    if (gapSeconds > gapThresholdSeconds) {
      chunks.push({ chunk: current, gapBefore });
      current = [pings[i]];
      gapBefore = {
        stage: 'signal_lost',
        startTime: pings[i - 1].timestamp,
        endTime: pings[i].timestamp,
        durationMinutes: gapSeconds / 60,
      };
    } else {
      current.push(pings[i]);
    }
  }
  chunks.push({ chunk: current, gapBefore });
  return chunks;
}

/** Groups a gap-free chunk into dwell/travel runs, threading cargo state across chunks. */
function segmentChunk(
  chunk: GpsPing[],
  opts: Required<TripCycleOptions>,
  cargoState: { value: 'empty' | 'loaded' },
): StageSegment[] {
  const segments: StageSegment[] = [];
  let idx = 0;
  while (idx < chunk.length) {
    const startMoving = isMoving(chunk[idx], opts.movingSpeedThresholdKph);
    let end = idx;
    while (end + 1 < chunk.length && isMoving(chunk[end + 1], opts.movingSpeedThresholdKph) === startMoving) {
      end++;
    }
    const durationMinutes = minutesBetween(chunk[idx].timestamp, chunk[end].timestamp);

    let stage: TripStage;
    if (startMoving) {
      stage = cargoState.value === 'loaded' ? 'loaded_travel' : 'empty_travel';
    } else if (durationMinutes > opts.maxDwellMinutes) {
      stage = 'idle';
    } else {
      stage = cargoState.value === 'empty' ? 'loading' : 'dumping';
      cargoState.value = cargoState.value === 'empty' ? 'loaded' : 'empty';
    }

    segments.push({ stage, startTime: chunk[idx].timestamp, endTime: chunk[end].timestamp, durationMinutes });
    idx = end + 1;
  }
  return segments;
}

/** One completed Loading -> LoadedTravel -> Dumping -> EmptyTravel cycle, per source doc Section 3. */
function computeCycleStats(segments: StageSegment[]): { tripsCount: number; avgCycleTimeMinutes: number | null } {
  const cycleDurations: number[] = [];
  for (let k = 0; k < segments.length; k++) {
    if (segments[k].stage !== 'dumping') continue;

    let loadingIdx = k;
    while (loadingIdx >= 0 && segments[loadingIdx].stage !== 'loading') loadingIdx--;
    if (loadingIdx < 0) continue; // malformed - the state machine should never produce a dumping with no prior loading

    let endIdx = k;
    for (let m = k + 1; m < segments.length; m++) {
      if (segments[m].stage === 'empty_travel') {
        endIdx = m;
        break;
      }
      if (segments[m].stage === 'loading') break; // next cycle began before an empty_travel was seen
    }

    cycleDurations.push(minutesBetween(segments[loadingIdx].startTime, segments[endIdx].endTime));
  }

  const tripsCount = cycleDurations.length;
  const avgCycleTimeMinutes = tripsCount > 0 ? cycleDurations.reduce((a, b) => a + b, 0) / tripsCount : null;
  return { tripsCount, avgCycleTimeMinutes };
}

/**
 * Infers trip-cycle stages from a raw, ambiguous ping stream (Review
 * Decisions #5) - no pre-labeled events. Stage boundaries come from speed,
 * dwell duration, and ping gaps, the same way this would have to work
 * against a real vendor's telemetry feed.
 */
export function analyzeShift(pings: GpsPing[], options: TripCycleOptions = {}): ShiftAnalysis {
  const opts = { ...DEFAULTS, ...options };
  if (pings.length === 0) {
    return {
      segments: [],
      tripsCount: 0,
      avgCycleTimeMinutes: null,
      workingHours: 0,
      availableHours: 0,
      utilizationPct: 0,
      totalDistanceKm: 0,
    };
  }

  const cargoState = { value: 'empty' as 'empty' | 'loaded' };
  const segments: StageSegment[] = [];

  for (const { chunk, gapBefore } of splitByGaps(pings, opts.signalLostGapSeconds)) {
    if (gapBefore) segments.push(gapBefore);
    segments.push(...segmentChunk(chunk, opts, cargoState));
  }

  const { tripsCount, avgCycleTimeMinutes } = computeCycleStats(segments);

  const workingMinutes = segments
    .filter((s) => CYCLE_STAGES.has(s.stage))
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const availableHours = minutesBetween(pings[0].timestamp, pings[pings.length - 1].timestamp) / 60;
  const workingHours = workingMinutes / 60;
  const utilizationPct = availableHours > 0 ? (workingHours / availableHours) * 100 : 0;
  const totalDistanceKm = pings[pings.length - 1].odometerKm - pings[0].odometerKm;

  return { segments, tripsCount, avgCycleTimeMinutes, workingHours, availableHours, utilizationPct, totalDistanceKm };
}
