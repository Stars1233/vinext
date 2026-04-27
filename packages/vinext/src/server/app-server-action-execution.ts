import type { HeadersAccessPhase } from "../shims/headers.js";
import { mergeMiddlewareResponseHeaders } from "./middleware-response-headers.js";
import { validateCsrfOrigin, validateServerActionPayload } from "./request-pipeline.js";

type AppServerActionErrorReporter = (
  error: Error,
  request: { path: string; method: string; headers: Record<string, string> },
  route: { routerKind: "App Router"; routePath: string; routeType: "action" },
) => void;

type AppServerActionDecoder = (body: FormData) => Promise<unknown>;

type ReadFormDataWithLimit = (request: Request, maxBytes: number) => Promise<FormData>;

export type HandleProgressiveServerActionRequestOptions = {
  actionId: string | null;
  allowedOrigins: string[];
  cleanPathname: string;
  clearRequestContext: () => void;
  contentType: string;
  decodeAction: AppServerActionDecoder;
  getAndClearPendingCookies: () => string[];
  getDraftModeCookieHeader: () => string | null | undefined;
  maxActionBodySize: number;
  middlewareHeaders: Headers | null;
  readFormDataWithLimit: ReadFormDataWithLimit;
  reportRequestError: AppServerActionErrorReporter;
  request: Request;
  setHeadersAccessPhase: (phase: HeadersAccessPhase) => HeadersAccessPhase;
};

type ActionControlResponse =
  | {
      kind: "redirect";
      url: string;
    }
  | {
      kind: "status";
      statusCode: number;
    };

function isRequestBodyTooLarge(error: unknown): boolean {
  return error instanceof Error && error.message === "Request body too large";
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

function getActionControlResponse(error: unknown): ActionControlResponse | null {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return null;
  }

  const digest = String(error.digest);
  if (digest.startsWith("NEXT_REDIRECT;")) {
    const parts = digest.split(";");
    const encodedUrl = parts[2];
    if (!encodedUrl) {
      return null;
    }

    return {
      kind: "redirect",
      url: decodeURIComponent(encodedUrl),
    };
  }

  if (digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;")) {
    const statusCode = digest === "NEXT_NOT_FOUND" ? 404 : parseInt(digest.split(";")[1], 10);
    if (!Number.isInteger(statusCode)) {
      return null;
    }

    return {
      kind: "status",
      statusCode,
    };
  }

  return null;
}

export function isProgressiveServerActionRequest(
  request: Pick<Request, "method">,
  contentType: string,
  actionId: string | null,
): boolean {
  return (
    request.method.toUpperCase() === "POST" &&
    contentType.startsWith("multipart/form-data") &&
    !actionId
  );
}

export async function handleProgressiveServerActionRequest(
  options: HandleProgressiveServerActionRequestOptions,
): Promise<Response | null> {
  if (!isProgressiveServerActionRequest(options.request, options.contentType, options.actionId)) {
    return null;
  }

  const csrfResponse = validateCsrfOrigin(options.request, options.allowedOrigins);
  if (csrfResponse) {
    return csrfResponse;
  }

  const contentLength = parseInt(options.request.headers.get("content-length") || "0", 10);
  if (contentLength > options.maxActionBodySize) {
    options.clearRequestContext();
    return new Response("Payload Too Large", { status: 413 });
  }

  try {
    let body: FormData;
    try {
      // Progressive submissions can still fall through to a regular page render when
      // the multipart body is not an action payload. Read a clone so that fallback
      // code can still consume the original request body.
      body = await options.readFormDataWithLimit(
        options.request.clone(),
        options.maxActionBodySize,
      );
    } catch (error) {
      if (isRequestBodyTooLarge(error)) {
        options.clearRequestContext();
        return new Response("Payload Too Large", { status: 413 });
      }
      throw error;
    }

    const payloadResponse = await validateServerActionPayload(body);
    if (payloadResponse) {
      options.clearRequestContext();
      return payloadResponse;
    }

    const action = await options.decodeAction(body);
    if (typeof action !== "function") {
      return null;
    }

    let actionControlResponse: ActionControlResponse | null = null;
    const previousHeadersPhase = options.setHeadersAccessPhase("action");
    try {
      await action();
    } catch (error) {
      actionControlResponse = getActionControlResponse(error);
      if (!actionControlResponse) {
        throw error;
      }
    } finally {
      options.setHeadersAccessPhase(previousHeadersPhase);
    }

    if (!actionControlResponse) {
      // Next.js decodes form state and re-renders after a successful MPA action.
      // vinext currently supports the redirect/error status cases; successful
      // non-redirect actions intentionally fall through to the page render.
      return null;
    }

    const actionPendingCookies = options.getAndClearPendingCookies();
    const actionDraftCookie = options.getDraftModeCookieHeader();
    options.clearRequestContext();

    const headers = new Headers();
    if (actionControlResponse.kind === "redirect") {
      headers.set("Location", new URL(actionControlResponse.url, options.request.url).toString());
    }
    mergeMiddlewareResponseHeaders(headers, options.middlewareHeaders);
    for (const cookie of actionPendingCookies) {
      headers.append("Set-Cookie", cookie);
    }
    if (actionDraftCookie) {
      headers.append("Set-Cookie", actionDraftCookie);
    }

    return new Response(null, {
      status: actionControlResponse.kind === "redirect" ? 303 : actionControlResponse.statusCode,
      headers,
    });
  } catch (error) {
    options.getAndClearPendingCookies();
    // Next.js rethrows generic MPA action errors into its page render path.
    // vinext does not yet implement that form-state render path, so unexpected
    // action failures remain request failures here.
    console.error("[vinext] Server action error:", error);
    options.reportRequestError(
      normalizeError(error),
      {
        path: options.cleanPathname,
        method: options.request.method,
        headers: Object.fromEntries(options.request.headers.entries()),
      },
      { routerKind: "App Router", routePath: options.cleanPathname, routeType: "action" },
    );
    options.clearRequestContext();
    return new Response(
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : "Server action failed: " + getErrorMessage(error),
      { status: 500 },
    );
  }
}
