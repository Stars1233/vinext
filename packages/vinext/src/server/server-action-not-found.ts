import { NEXTJS_ACTION_NOT_FOUND_HEADER as SERVER_ACTION_NOT_FOUND_HEADER } from "./headers.js";
import { UnrecognizedActionError } from "vinext/shims/unrecognized-action-error";

const SERVER_ACTION_NOT_FOUND_DOCS =
  "https://nextjs.org/docs/messages/failed-to-find-server-action";
const SERVER_ACTION_NOT_FOUND_BODY = "Server action not found.";

function getServerActionNotFoundPrefix(actionId: string | null): string {
  return `Failed to find Server Action${actionId ? ` "${actionId}"` : ""}.`;
}

export function getServerActionNotFoundMessage(actionId: string | null): string {
  return `${getServerActionNotFoundPrefix(
    actionId,
  )} This request might be from an older or newer deployment.\nRead more: ${SERVER_ACTION_NOT_FOUND_DOCS}`;
}

function getServerActionNotFoundClientMessage(actionId: string): string {
  return `Server Action "${actionId}" was not found on the server. \nRead more: ${SERVER_ACTION_NOT_FOUND_DOCS}`;
}

function getUnknownMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

export function isServerActionNotFoundError(error: unknown, actionId: string | null): boolean {
  const message = getUnknownMessage(error);
  if (!message) {
    return false;
  }

  if (!actionId) {
    return message.startsWith("Failed to find Server Action");
  }

  if (message.startsWith(getServerActionNotFoundPrefix(actionId))) {
    return true;
  }

  return Boolean(actionId && message.includes(`[vite-rsc] invalid server reference '${actionId}'`));
}

export function createServerActionNotFoundResponse(): Response {
  return new Response(SERVER_ACTION_NOT_FOUND_BODY, {
    status: 404,
    headers: {
      [SERVER_ACTION_NOT_FOUND_HEADER]: "1",
      "content-type": "text/plain",
    },
  });
}

function isServerActionNotFoundResponse(response: Pick<Response, "headers">): boolean {
  return response.headers.get(SERVER_ACTION_NOT_FOUND_HEADER) === "1";
}

/**
 * Throw an `UnrecognizedActionError` when the server reported the requested
 * server action id as unknown (the `x-nextjs-action-not-found` response
 * header); otherwise return so the caller can keep processing the response.
 *
 * The client-side counterpart of `createServerActionNotFoundResponse`. The
 * typed error lets client `catch` blocks call the public
 * `unstable_isUnrecognizedActionError` predicate to detect client/server
 * deployment skew and recover (typically by reloading the page).
 *
 * Mirrors Next.js, whose server-action reducer throws `UnrecognizedActionError`
 * on this same response header:
 * https://github.com/vercel/next.js/blob/canary/packages/next/src/client/components/router-reducer/reducers/server-action-reducer.ts
 */
export function throwOnServerActionNotFound(
  response: Pick<Response, "headers">,
  actionId: string,
): void {
  if (isServerActionNotFoundResponse(response)) {
    throw new UnrecognizedActionError(getServerActionNotFoundClientMessage(actionId));
  }
}
