import { describe, expect, it, vi } from "vite-plus/test";
import {
  handleProgressiveServerActionRequest,
  isProgressiveServerActionRequest,
  type HandleProgressiveServerActionRequestOptions,
} from "../packages/vinext/src/server/app-server-action-execution.js";

function createMultipartRequest(headers?: HeadersInit): Request {
  const requestHeaders = new Headers({
    "content-type": "multipart/form-data; boundary=vinext",
    host: "example.com",
    origin: "https://example.com",
  });
  if (headers) {
    for (const [key, value] of new Headers(headers)) {
      requestHeaders.set(key, value);
    }
  }

  return new Request("https://example.com/action-source", {
    method: "POST",
    headers: requestHeaders,
  });
}

function createMultipartBodyRequest(body: FormData): Request {
  return new Request("https://example.com/action-source", {
    method: "POST",
    body,
    headers: {
      host: "example.com",
      origin: "https://example.com",
    },
  });
}

function createOptions(
  overrides: Partial<HandleProgressiveServerActionRequestOptions> = {},
): HandleProgressiveServerActionRequestOptions {
  return {
    actionId: null,
    allowedOrigins: [],
    cleanPathname: "/action-source",
    clearRequestContext() {},
    contentType: "multipart/form-data; boundary=vinext",
    async decodeAction() {
      return null;
    },
    getAndClearPendingCookies() {
      return [];
    },
    getDraftModeCookieHeader() {
      return null;
    },
    maxActionBodySize: 1024,
    middlewareHeaders: null,
    async readFormDataWithLimit() {
      return new FormData();
    },
    reportRequestError() {},
    request: createMultipartRequest(),
    setHeadersAccessPhase() {
      return "render";
    },
    ...overrides,
  };
}

describe("app server action execution helpers", () => {
  it("identifies progressive multipart server action submissions", () => {
    expect(
      isProgressiveServerActionRequest(
        { method: "post" },
        "multipart/form-data; boundary=vinext",
        null,
      ),
    ).toBe(true);
    expect(
      isProgressiveServerActionRequest(
        { method: "POST" },
        "multipart/form-data; boundary=vinext",
        "action-id",
      ),
    ).toBe(false);
    expect(isProgressiveServerActionRequest({ method: "GET" }, "multipart/form-data", null)).toBe(
      false,
    );
    expect(isProgressiveServerActionRequest({ method: "POST" }, "text/plain", null)).toBe(false);
  });

  it("returns null for non-progressive action requests", async () => {
    const response = await handleProgressiveServerActionRequest(
      createOptions({
        actionId: "action-id",
        decodeAction: vi.fn(),
      }),
    );

    expect(response).toBeNull();
  });

  it("returns null for non-action multipart posts without consuming the original body", async () => {
    const formData = new FormData();
    formData.set("field", "value");
    const request = createMultipartBodyRequest(formData);

    const response = await handleProgressiveServerActionRequest(
      createOptions({
        contentType: request.headers.get("content-type") ?? "",
        async decodeAction() {
          return null;
        },
        readFormDataWithLimit(readRequest) {
          return readRequest.formData();
        },
        request,
      }),
    );

    expect(response).toBeNull();
    expect((await request.formData()).get("field")).toBe("value");
  });

  it("enforces content-length and stream body limits", async () => {
    const clearContext = vi.fn();
    const lengthResponse = await handleProgressiveServerActionRequest(
      createOptions({
        clearRequestContext: clearContext,
        maxActionBodySize: 10,
        request: createMultipartRequest({ "content-length": "11" }),
      }),
    );

    expect(lengthResponse?.status).toBe(413);
    expect(await lengthResponse?.text()).toBe("Payload Too Large");
    expect(clearContext).toHaveBeenCalledTimes(1);

    const streamLimitResponse = await handleProgressiveServerActionRequest(
      createOptions({
        clearRequestContext: clearContext,
        readFormDataWithLimit() {
          throw new Error("Request body too large");
        },
      }),
    );

    expect(streamLimitResponse?.status).toBe(413);
    expect(await streamLimitResponse?.text()).toBe("Payload Too Large");
    expect(clearContext).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed action payloads before decoding the action", async () => {
    const formData = new FormData();
    formData.set("0", '"$Q1"');
    const decodeAction = vi.fn();

    const response = await handleProgressiveServerActionRequest(
      createOptions({
        decodeAction,
        readFormDataWithLimit() {
          return Promise.resolve(formData);
        },
      }),
    );

    expect(response?.status).toBe(400);
    expect(await response?.text()).toBe("Invalid server action payload");
    expect(decodeAction).not.toHaveBeenCalled();
  });

  it("executes decoded form actions and converts redirects into 303 responses", async () => {
    const phaseCalls: string[] = [];
    const clearContext = vi.fn();
    const formData = new FormData();
    formData.set("$ACTION_ID_test", "");

    const response = await handleProgressiveServerActionRequest(
      createOptions({
        clearRequestContext: clearContext,
        async decodeAction(body) {
          expect(body).toBe(formData);
          return () => {
            throw { digest: "NEXT_REDIRECT;replace;%2Fresult%3Fok%3D1;307" };
          };
        },
        getAndClearPendingCookies() {
          return ["session=1; Path=/"];
        },
        getDraftModeCookieHeader() {
          return "draft=1; Path=/";
        },
        middlewareHeaders: new Headers([["x-middleware", "present"]]),
        readFormDataWithLimit() {
          return Promise.resolve(formData);
        },
        setHeadersAccessPhase(phase) {
          phaseCalls.push(phase);
          return "render";
        },
      }),
    );

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("https://example.com/result?ok=1");
    expect(response?.headers.get("x-middleware")).toBe("present");
    expect(response?.headers.getSetCookie()).toEqual(["session=1; Path=/", "draft=1; Path=/"]);
    expect(phaseCalls).toEqual(["action", "render"]);
    expect(clearContext).toHaveBeenCalledTimes(1);
  });

  it("falls through after successful non-redirect actions without consuming the original body", async () => {
    const formData = new FormData();
    formData.set("$ACTION_ID_test", "");
    formData.set("field", "value");
    const request = createMultipartBodyRequest(formData);
    let actionRan = false;

    const response = await handleProgressiveServerActionRequest(
      createOptions({
        contentType: request.headers.get("content-type") ?? "",
        async decodeAction() {
          return () => {
            actionRan = true;
          };
        },
        readFormDataWithLimit(readRequest) {
          return readRequest.formData();
        },
        request,
      }),
    );

    expect(response).toBeNull();
    expect(actionRan).toBe(true);
    expect((await request.formData()).get("field")).toBe("value");
  });

  it("maps action HTTP fallback errors to status responses", async () => {
    for (const [digest, statusCode] of [
      ["NEXT_NOT_FOUND", 404],
      ["NEXT_HTTP_ERROR_FALLBACK;403", 403],
    ]) {
      const clearContext = vi.fn();
      const reportedErrors: Error[] = [];

      const response = await handleProgressiveServerActionRequest(
        createOptions({
          clearRequestContext: clearContext,
          async decodeAction() {
            return () => {
              throw { digest };
            };
          },
          reportRequestError(error) {
            reportedErrors.push(error);
          },
        }),
      );

      expect(response?.status).toBe(statusCode);
      expect(reportedErrors).toEqual([]);
      expect(clearContext).toHaveBeenCalledTimes(1);
    }
  });

  it("reports action execution failures and clears pending cookies", async () => {
    const reportedErrors: Error[] = [];
    const clearedCookies = vi.fn(() => ["session=1; Path=/"]);
    const clearContext = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await handleProgressiveServerActionRequest(
      createOptions({
        cleanPathname: "/action-source",
        clearRequestContext: clearContext,
        async decodeAction() {
          return () => {
            throw new Error("boom");
          };
        },
        getAndClearPendingCookies: clearedCookies,
        reportRequestError(error) {
          reportedErrors.push(error);
        },
      }),
    );

    expect(response?.status).toBe(500);
    expect(await response?.text()).toBe("Server action failed: boom");
    expect(reportedErrors.map((error) => error.message)).toEqual(["boom"]);
    expect(clearedCookies).toHaveBeenCalledTimes(1);
    expect(clearContext).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
