/** A failed JSON-RPC call. `code` is `RPC_UNREACHABLE`, `RPC_BAD_RESPONSE`, or `RPC_<n>` for the node's error code `n`. */
export class RpcError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly url: string,
    readonly method: string,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

/** One JSON-RPC call over HTTP. Returns `result`; throws `RpcError` for a transport failure or an `error` reply. */
export async function rpc(url: string, method: string, params: unknown[] = []): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch (e) {
    throw new RpcError("RPC_UNREACHABLE", `Cannot reach ${url}: ${(e as Error).message}`, url, method);
  }
  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new RpcError("RPC_BAD_RESPONSE", `${url} answered HTTP ${res.status} without JSON`, url, method);
  }
  if (body.error) throw new RpcError(`RPC_${body.error.code}`, body.error.message, url, method);
  return body.result;
}
