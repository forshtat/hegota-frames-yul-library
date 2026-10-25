import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { RpcError, rpc } from "../src/rpc/index.js";

describe("rpc", () => {
  let server: http.Server;
  let url: string;
  let seen: any;

  before(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        seen = JSON.parse(raw);
        res.setHeader("content-type", "application/json");
        if (seen.method === "ok") res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x539" }));
        else if (seen.method === "fail") res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32502, message: "rejected" } }));
        else res.end("<html>not json</html>");
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => server.close());

  it("posts a JSON-RPC request and returns the result", async () => {
    assert.equal(await rpc(url, "ok", [1]), "0x539");
    assert.deepEqual([seen.method, seen.params], ["ok", [1]]);
  });

  it("throws RPC_<code> with the node's message for an error reply", async () => {
    await assert.rejects(rpc(url, "fail"), (e: RpcError) => e instanceof RpcError && e.code === "RPC_-32502" && e.message === "rejected" && e.method === "fail");
  });

  it("throws RPC_BAD_RESPONSE when the body is not JSON", async () => {
    await assert.rejects(rpc(url, "other"), (e: RpcError) => e.code === "RPC_BAD_RESPONSE");
  });

  it("throws RPC_UNREACHABLE when nothing listens", async () => {
    await assert.rejects(rpc("http://127.0.0.1:1", "ok"), (e: RpcError) => e.code === "RPC_UNREACHABLE");
  });
});
