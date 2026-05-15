import type { AppRouteSemanticIds } from "../routing/app-route-graph.js";
import { fnv1a64 } from "../utils/hash.js";

export const CACHE_PROOF_MODEL_SCHEMA_VERSION = 0;
export type CacheProofModelSchemaVersion = 0;

export type CacheProofRejectionCode =
  | "CP_MODEL_DISABLED"
  | "CP_DIMENSION_COUNT_EXCEEDED"
  | "CP_DIMENSION_NAME_MISSING"
  | "CP_DIMENSION_NAME_TOO_LONG"
  | "CP_DIMENSION_VALUE_COUNT_EXCEEDED"
  | "CP_DIMENSION_VALUE_TOO_LONG"
  | "CP_DIMENSION_VALUES_MISSING"
  | "CP_ENCODED_VARIANT_TOO_LONG"
  | "CP_INVALID_VARIANT_BUDGET"
  | "CP_ROUTE_VARIANT_CEILING_EXCEEDED"
  | "CP_UNSAFE_PUBLIC_DIMENSION"
  | "CP_BOUNDARY_OUTCOME_MISMATCH"
  | "CP_BOUNDARY_OUTCOME_UNKNOWN";

export type CacheProofTraceFieldValue = string | number | boolean | null | readonly string[];

export type CacheProofTraceFields = Readonly<Record<string, CacheProofTraceFieldValue>>;

export type CacheProofBreakerFallbackMode = "renderFresh" | "privateUncacheable";
export type CacheProofFallbackScope = "affectedOutput" | "route";

export type CacheProofBreakerFallback = Readonly<{
  kind: "breakerFallback";
  code: CacheProofRejectionCode;
  mode: CacheProofBreakerFallbackMode;
  scope: CacheProofFallbackScope;
  fields: CacheProofTraceFields;
}>;

export type CacheVariantBudget = Readonly<{
  maxDimensionCount: number;
  maxDimensionNameLength: number;
  maxDimensionValueLength: number;
  maxEncodedLength: number;
  maxValuesPerDimension: number;
  maxVariantsPerRoute: number;
}>;

export const DEFAULT_CACHE_VARIANT_BUDGET = {
  maxDimensionCount: 8,
  maxDimensionNameLength: 64,
  maxDimensionValueLength: 256,
  maxEncodedLength: 1024,
  maxValuesPerDimension: 8,
  maxVariantsPerRoute: 64,
} satisfies CacheVariantBudget;

export type CacheVariantDimensionSource =
  | "auth"
  | "cookie"
  | "custom"
  | "draft-mode"
  | "header"
  | "interception"
  | "mounted-slots"
  | "params"
  | "route"
  | "search"
  | "session";

export type CacheVariantDimensionPrivacy = "internal" | "private" | "public";

export type CacheVariantDimensionInput = Readonly<{
  name: string;
  privacy: CacheVariantDimensionPrivacy;
  source: CacheVariantDimensionSource;
  values: readonly string[];
}>;

export type CacheVariantDimension = Readonly<{
  encoded: string;
  name: string;
  privacy: CacheVariantDimensionPrivacy;
  source: CacheVariantDimensionSource;
  valueCount: number;
  valueHashes: readonly string[];
}>;

export type CacheProofOutputScope =
  | Readonly<{
      kind: "app-html";
      renderEpoch: string | null;
      rootBoundaryId: string | null;
      routeId: string;
    }>
  | Readonly<{
      kind: "app-rsc";
      mountedSlotsFingerprint: string | null;
      renderEpoch: string | null;
      rootBoundaryId: string | null;
      routeId: string;
    }>
  | Readonly<{
      kind: "layout";
      layoutId: string;
      rootBoundaryId: string | null;
      routeId: string;
    }>
  | Readonly<{
      kind: "page";
      pageId: string;
      rootBoundaryId: string | null;
      routeId: string;
    }>
  | Readonly<{
      kind: "route-handler";
      routeHandlerId: string;
      routeId: string;
    }>
  | Readonly<{
      kind: "slot";
      rootBoundaryId: string | null;
      routeId: string;
      slotId: string;
    }>
  | Readonly<{
      kind: "template";
      rootBoundaryId: string | null;
      routeId: string;
      templateId: string;
    }>;

export type CacheVariant = Readonly<{
  budget: CacheVariantBudget;
  cacheKey: string;
  dimensions: readonly CacheVariantDimension[];
  encodedLength: number;
  output: CacheProofOutputScope;
  schemaVersion: CacheProofModelSchemaVersion;
}>;

export type BuildCacheVariantInput = Readonly<{
  budget: CacheVariantBudget;
  dimensions: readonly CacheVariantDimensionInput[];
  existingVariantCount: number;
  output: CacheProofOutputScope;
}>;

export type BuildCacheVariantResult =
  | Readonly<{ kind: "variant"; variant: CacheVariant }>
  | Readonly<{ kind: "breakerFallback"; fallback: CacheProofBreakerFallback }>;

export type AppRouteCacheProofGraphScopeInput = Readonly<{
  ids: AppRouteSemanticIds;
}>;

export type AppRouteCacheProofGraphScope = Readonly<{
  layoutIds: readonly string[];
  pageId: string | null;
  routeHandlerId: string | null;
  routeId: string;
  slotIds: readonly string[];
  templateIds: readonly string[];
}>;

export type BoundaryOutcome =
  | Readonly<{ kind: "error"; digest?: string }>
  | Readonly<{ kind: "forbidden" }>
  | Readonly<{ kind: "globalError"; digest?: string }>
  | Readonly<{ kind: "notFound" }>
  | Readonly<{ kind: "redirect"; location: string; status: number }>
  | Readonly<{ kind: "success" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "unknown" }>;

export type BoundaryOutcomeCompatibility =
  | Readonly<{
      kind: "compatible";
      outcome: BoundaryOutcome;
      reason: "CP_BOUNDARY_OUTCOME_MATCH";
    }>
  | Readonly<{
      candidate: BoundaryOutcome;
      expected: BoundaryOutcome;
      fallback: CacheProofBreakerFallback;
      kind: "incompatible";
    }>;

export type RenderObservationCompleteness = "complete" | "partial" | "unknown";
export type RenderCacheability = "private" | "public" | "uncacheable" | "unknown";
export type RenderRequestApiKind =
  | "connection"
  | "cookies"
  | "draftMode"
  | "headers"
  | "params"
  | "searchParams";
export type RenderRequestApiStatus = "notObserved" | "observed" | "unknown";

export const ALL_RENDER_REQUEST_API_KINDS: readonly RenderRequestApiKind[] = [
  "connection",
  "cookies",
  "draftMode",
  "headers",
  "params",
  "searchParams",
];

export type RenderRequestApiObservation = Readonly<{
  kind: RenderRequestApiKind;
  status: RenderRequestApiStatus;
}>;

export type RenderObservation = Readonly<{
  boundaryOutcome: BoundaryOutcome;
  cacheTags: readonly string[];
  cacheability: RenderCacheability;
  completeness: RenderObservationCompleteness;
  dynamicFetches: readonly string[];
  output: CacheProofOutputScope;
  pathTags: readonly string[];
  requestApis: readonly RenderRequestApiObservation[];
  schemaVersion: CacheProofModelSchemaVersion;
}>;

export type BuildRenderObservationInput = Readonly<{
  boundaryOutcome: BoundaryOutcome;
  cacheTags: readonly string[];
  cacheability: RenderCacheability;
  completeness: RenderObservationCompleteness;
  dynamicFetches: readonly string[];
  output: CacheProofOutputScope;
  pathTags: readonly string[];
  requestApis: readonly RenderRequestApiObservation[];
}>;

export type BuildRenderRequestApiObservationsInput = Readonly<{
  completeness: RenderObservationCompleteness;
  observed: readonly RenderRequestApiKind[];
}>;

export type DisabledCacheProofDecision = Readonly<{
  canReuse: false;
  fallback: CacheProofBreakerFallback;
  kind: "disabled";
  observation: RenderObservation;
  variant: CacheVariant;
}>;

export type CreateDisabledCacheProofDecisionInput = Readonly<{
  observation: RenderObservation;
  variant: CacheVariant;
}>;

const PUBLIC_UNSAFE_DIMENSION_SOURCES: ReadonlySet<CacheVariantDimensionSource> = new Set([
  "auth",
  "cookie",
  "draft-mode",
  "header",
  "session",
]);

type CacheVariantDimensionAccumulator = {
  name: string;
  privacy: CacheVariantDimensionPrivacy;
  source: CacheVariantDimensionSource;
  values: string[];
};

type DimensionAccumulatorByName = Map<string, CacheVariantDimensionAccumulator>;
type DimensionAccumulatorByPrivacy = Map<CacheVariantDimensionPrivacy, DimensionAccumulatorByName>;
type DimensionAccumulatorBySource = Map<CacheVariantDimensionSource, DimensionAccumulatorByPrivacy>;

function buildBreakerFallback(
  code: CacheProofRejectionCode,
  fields: CacheProofTraceFields = {},
  mode: CacheProofBreakerFallbackMode = "renderFresh",
  scope: CacheProofFallbackScope = "affectedOutput",
): CacheProofBreakerFallback {
  return {
    kind: "breakerFallback",
    code,
    mode,
    scope,
    fields,
  };
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function normalizeDimensionName(name: string): string {
  return name.trim().toLowerCase();
}

function redactValue(value: string): string {
  return `h:${fnv1a64(value)}`;
}

function sortedUniqueRedacted(values: readonly string[]): string[] {
  return sortedUnique(sortedUnique(values).map(redactValue));
}

function encodeParts(parts: readonly unknown[]): string {
  return JSON.stringify(parts);
}

function compareDimensions(a: CacheVariantDimension, b: CacheVariantDimension): number {
  return (
    a.source.localeCompare(b.source) ||
    a.name.localeCompare(b.name) ||
    a.privacy.localeCompare(b.privacy)
  );
}

function encodeNullable(value: string | null): string | null {
  return value;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled cache proof variant: ${String(value)}`);
}

function encodeOutputScope(output: CacheProofOutputScope): string {
  switch (output.kind) {
    case "app-html":
      return encodeParts([
        output.kind,
        output.routeId,
        encodeNullable(output.rootBoundaryId),
        encodeNullable(output.renderEpoch),
      ]);
    case "app-rsc":
      return encodeParts([
        output.kind,
        output.routeId,
        encodeNullable(output.rootBoundaryId),
        encodeNullable(output.renderEpoch),
        encodeNullable(output.mountedSlotsFingerprint),
      ]);
    case "layout":
      return encodeParts([
        output.kind,
        output.routeId,
        output.layoutId,
        encodeNullable(output.rootBoundaryId),
      ]);
    case "page":
      return encodeParts([
        output.kind,
        output.routeId,
        output.pageId,
        encodeNullable(output.rootBoundaryId),
      ]);
    case "route-handler":
      return encodeParts([output.kind, output.routeId, output.routeHandlerId]);
    case "slot":
      return encodeParts([
        output.kind,
        output.routeId,
        output.slotId,
        encodeNullable(output.rootBoundaryId),
      ]);
    case "template":
      return encodeParts([
        output.kind,
        output.routeId,
        output.templateId,
        encodeNullable(output.rootBoundaryId),
      ]);
    default:
      return assertNever(output);
  }
}

function validateBudgetNumber(name: string, value: number): CacheProofBreakerFallback | null {
  if (Number.isInteger(value) && value >= 0) return null;
  return buildBreakerFallback("CP_INVALID_VARIANT_BUDGET", {
    budgetField: name,
  });
}

function validateBudget(budget: CacheVariantBudget): CacheProofBreakerFallback | null {
  return (
    validateBudgetNumber("maxDimensionCount", budget.maxDimensionCount) ??
    validateBudgetNumber("maxDimensionNameLength", budget.maxDimensionNameLength) ??
    validateBudgetNumber("maxDimensionValueLength", budget.maxDimensionValueLength) ??
    validateBudgetNumber("maxEncodedLength", budget.maxEncodedLength) ??
    validateBudgetNumber("maxValuesPerDimension", budget.maxValuesPerDimension) ??
    validateBudgetNumber("maxVariantsPerRoute", budget.maxVariantsPerRoute)
  );
}

function buildDimension(
  input: CacheVariantDimensionInput,
  budget: CacheVariantBudget,
): CacheVariantDimension | CacheProofBreakerFallback {
  const name = normalizeDimensionName(input.name);
  if (name.length === 0) {
    return buildBreakerFallback("CP_DIMENSION_NAME_MISSING", {
      source: input.source,
    });
  }
  if (name.length > budget.maxDimensionNameLength) {
    return buildBreakerFallback("CP_DIMENSION_NAME_TOO_LONG", {
      maxLength: budget.maxDimensionNameLength,
      nameHash: redactValue(name),
      source: input.source,
    });
  }
  if (input.privacy === "public" && PUBLIC_UNSAFE_DIMENSION_SOURCES.has(input.source)) {
    return buildBreakerFallback(
      "CP_UNSAFE_PUBLIC_DIMENSION",
      {
        name,
        source: input.source,
      },
      "privateUncacheable",
    );
  }

  const values = sortedUnique(input.values);
  if (values.length === 0) {
    return buildBreakerFallback("CP_DIMENSION_VALUES_MISSING", {
      name,
      source: input.source,
    });
  }
  if (values.length > budget.maxValuesPerDimension) {
    return buildBreakerFallback("CP_DIMENSION_VALUE_COUNT_EXCEEDED", {
      maxValues: budget.maxValuesPerDimension,
      name,
      source: input.source,
      valueCount: values.length,
    });
  }
  for (const value of values) {
    if (value.length > budget.maxDimensionValueLength) {
      return buildBreakerFallback("CP_DIMENSION_VALUE_TOO_LONG", {
        maxLength: budget.maxDimensionValueLength,
        name,
        source: input.source,
        valueHash: redactValue(value),
      });
    }
  }

  const valueHashes = values.map(redactValue);
  const encoded = encodeParts([input.source, input.privacy, name, valueHashes]);

  return {
    encoded,
    name,
    privacy: input.privacy,
    source: input.source,
    valueCount: valueHashes.length,
    valueHashes,
  };
}

function isCacheProofBreakerFallback(
  value: CacheVariantDimension | CacheProofBreakerFallback,
): value is CacheProofBreakerFallback {
  return "code" in value;
}

function getDimensionBucket(
  bySource: DimensionAccumulatorBySource,
  source: CacheVariantDimensionSource,
  privacy: CacheVariantDimensionPrivacy,
): DimensionAccumulatorByName {
  const existingByPrivacy = bySource.get(source);
  const byPrivacy = existingByPrivacy ?? new Map();
  if (!existingByPrivacy) {
    bySource.set(source, byPrivacy);
  }

  const existingByName = byPrivacy.get(privacy);
  const byName = existingByName ?? new Map();
  if (!existingByName) {
    byPrivacy.set(privacy, byName);
  }

  return byName;
}

function mergeDimensionInputs(
  dimensions: readonly CacheVariantDimensionInput[],
): CacheVariantDimensionInput[] {
  const bySource: DimensionAccumulatorBySource = new Map();
  const orderedDimensions: CacheVariantDimensionAccumulator[] = [];

  for (const dimension of dimensions) {
    const name = normalizeDimensionName(dimension.name);
    const bucket = getDimensionBucket(bySource, dimension.source, dimension.privacy);
    const existing = bucket.get(name);
    if (existing) {
      existing.values.push(...dimension.values);
      continue;
    }
    const accumulator = {
      name,
      privacy: dimension.privacy,
      source: dimension.source,
      values: [...dimension.values],
    };
    bucket.set(name, accumulator);
    orderedDimensions.push(accumulator);
  }

  return orderedDimensions;
}

export function createAppRouteCacheProofGraphScope(
  route: AppRouteCacheProofGraphScopeInput,
): AppRouteCacheProofGraphScope {
  return {
    routeId: route.ids.route,
    pageId: route.ids.page,
    routeHandlerId: route.ids.routeHandler,
    layoutIds: [...route.ids.layouts],
    templateIds: [...route.ids.templates],
    slotIds: sortedUnique(Object.values(route.ids.slots)),
  };
}

export function buildCacheVariant(input: BuildCacheVariantInput): BuildCacheVariantResult {
  const budgetFallback = validateBudget(input.budget);
  if (budgetFallback) {
    return {
      kind: "breakerFallback",
      fallback: budgetFallback,
    };
  }
  if (input.existingVariantCount >= input.budget.maxVariantsPerRoute) {
    return {
      kind: "breakerFallback",
      fallback: buildBreakerFallback(
        "CP_ROUTE_VARIANT_CEILING_EXCEEDED",
        {
          existingVariantCount: input.existingVariantCount,
          maxVariantsPerRoute: input.budget.maxVariantsPerRoute,
          routeId: input.output.routeId,
        },
        "privateUncacheable",
        "route",
      ),
    };
  }
  const dimensionInputs = mergeDimensionInputs(input.dimensions);
  if (dimensionInputs.length > input.budget.maxDimensionCount) {
    return {
      kind: "breakerFallback",
      fallback: buildBreakerFallback("CP_DIMENSION_COUNT_EXCEEDED", {
        dimensionCount: dimensionInputs.length,
        maxDimensionCount: input.budget.maxDimensionCount,
        routeId: input.output.routeId,
      }),
    };
  }

  const dimensions: CacheVariantDimension[] = [];
  for (const dimensionInput of dimensionInputs) {
    const dimension = buildDimension(dimensionInput, input.budget);
    if (isCacheProofBreakerFallback(dimension)) {
      return {
        kind: "breakerFallback",
        fallback: dimension,
      };
    }
    dimensions.push(dimension);
  }
  dimensions.sort(compareDimensions);

  const encoded = [
    `schema:${CACHE_PROOF_MODEL_SCHEMA_VERSION}`,
    encodeOutputScope(input.output),
    ...dimensions.map((dimension) => dimension.encoded),
  ].join("|");

  if (encoded.length > input.budget.maxEncodedLength) {
    return {
      kind: "breakerFallback",
      fallback: buildBreakerFallback("CP_ENCODED_VARIANT_TOO_LONG", {
        encodedHash: redactValue(encoded),
        encodedLength: encoded.length,
        maxEncodedLength: input.budget.maxEncodedLength,
        routeId: input.output.routeId,
      }),
    };
  }

  return {
    kind: "variant",
    variant: {
      schemaVersion: CACHE_PROOF_MODEL_SCHEMA_VERSION,
      cacheKey: `cp0:${fnv1a64(encoded)}`,
      output: input.output,
      dimensions,
      encodedLength: encoded.length,
      budget: { ...input.budget },
    },
  };
}

function boundaryOutcomesMatch(expected: BoundaryOutcome, candidate: BoundaryOutcome): boolean {
  switch (expected.kind) {
    case "error":
      return candidate.kind === "error" && (expected.digest ?? "") === (candidate.digest ?? "");
    case "forbidden":
      return candidate.kind === "forbidden";
    case "globalError":
      return (
        candidate.kind === "globalError" && (expected.digest ?? "") === (candidate.digest ?? "")
      );
    case "notFound":
      return candidate.kind === "notFound";
    case "redirect":
      return (
        candidate.kind === "redirect" &&
        expected.status === candidate.status &&
        expected.location === candidate.location
      );
    case "success":
      return candidate.kind === "success";
    case "unauthorized":
      return candidate.kind === "unauthorized";
    case "unknown":
      return false;
    default:
      return assertNever(expected);
  }
}

export function buildBoundaryOutcomeCompatibility(input: {
  candidate: BoundaryOutcome;
  expected: BoundaryOutcome;
}): BoundaryOutcomeCompatibility {
  if (input.expected.kind === "unknown" || input.candidate.kind === "unknown") {
    return {
      kind: "incompatible",
      expected: input.expected,
      candidate: input.candidate,
      fallback: buildBreakerFallback("CP_BOUNDARY_OUTCOME_UNKNOWN", {
        candidateKind: input.candidate.kind,
        expectedKind: input.expected.kind,
      }),
    };
  }

  if (boundaryOutcomesMatch(input.expected, input.candidate)) {
    return {
      kind: "compatible",
      outcome: input.candidate,
      reason: "CP_BOUNDARY_OUTCOME_MATCH",
    };
  }

  return {
    kind: "incompatible",
    expected: input.expected,
    candidate: input.candidate,
    fallback: buildBreakerFallback("CP_BOUNDARY_OUTCOME_MISMATCH", {
      candidateKind: input.candidate.kind,
      expectedKind: input.expected.kind,
    }),
  };
}

function requestApiStatusRank(status: RenderRequestApiStatus): number {
  switch (status) {
    case "notObserved":
      return 0;
    case "unknown":
      return 1;
    case "observed":
      return 2;
    default:
      return assertNever(status);
  }
}

function normalizeRequestApiObservations(
  observations: readonly RenderRequestApiObservation[],
): RenderRequestApiObservation[] {
  const byKind = new Map<RenderRequestApiKind, RenderRequestApiStatus>();
  for (const observation of observations) {
    const current = byKind.get(observation.kind);
    if (
      current === undefined ||
      requestApiStatusRank(observation.status) > requestApiStatusRank(current)
    ) {
      byKind.set(observation.kind, observation.status);
    }
  }

  return [...byKind.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, status]) => ({ kind, status }));
}

export function buildRenderRequestApiObservations(
  input: BuildRenderRequestApiObservationsInput,
): RenderRequestApiObservation[] {
  const observedKinds = new Set(input.observed);
  const absentStatus: RenderRequestApiStatus =
    input.completeness === "complete" ? "notObserved" : "unknown";

  return ALL_RENDER_REQUEST_API_KINDS.map((kind) => ({
    kind,
    status: observedKinds.has(kind) ? "observed" : absentStatus,
  }));
}

export function buildRenderObservation(input: BuildRenderObservationInput): RenderObservation {
  return {
    schemaVersion: CACHE_PROOF_MODEL_SCHEMA_VERSION,
    output: input.output,
    completeness: input.completeness,
    boundaryOutcome: input.boundaryOutcome,
    requestApis: normalizeRequestApiObservations(input.requestApis),
    dynamicFetches: sortedUniqueRedacted(input.dynamicFetches),
    cacheTags: sortedUnique(input.cacheTags),
    pathTags: sortedUnique(input.pathTags),
    cacheability: input.cacheability,
  };
}

export function hasCompleteNegativeRequestApiProof(
  observation: RenderObservation,
  requiredApis: readonly RenderRequestApiKind[],
): boolean {
  if (observation.completeness !== "complete") return false;

  const statuses = new Map<RenderRequestApiKind, RenderRequestApiStatus>();
  for (const requestApi of observation.requestApis) {
    statuses.set(requestApi.kind, requestApi.status);
  }

  for (const api of requiredApis) {
    if (statuses.get(api) !== "notObserved") return false;
  }
  return true;
}

export function createDisabledCacheProofDecision(
  input: CreateDisabledCacheProofDecisionInput,
): DisabledCacheProofDecision {
  return {
    kind: "disabled",
    canReuse: false,
    variant: input.variant,
    observation: input.observation,
    fallback: buildBreakerFallback("CP_MODEL_DISABLED"),
  };
}
