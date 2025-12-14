import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("Node Registry: Remove Node", () => {
  // Helper to create a sample public key buffer (33 bytes)
  const samplePublicKey = Cl.buffer(new Uint8Array(33).fill(1));
  const sampleEndpoint = Cl.stringAscii("https://node1.example.com/api");

  it("allows owner to remove a registered node", () => {
    // First, register a node as wallet1
    const registerResult = simnet.callPublicFn(
      "node-registry",
      "register-node",
      [samplePublicKey, sampleEndpoint],
      wallet1
    );
    expect(registerResult.result).toBeOk(Cl.bool(true));

    // Verify node exists
    const nodeBefore = simnet.callReadOnlyFn(
      "node-registry",
      "get-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(nodeBefore.result).not.toBeNone();

    // Owner (deployer) removes the node
    const removeResult = simnet.callPublicFn(
      "node-registry",
      "remove-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(removeResult.result).toBeOk(Cl.bool(true));

    // Verify node no longer exists
    const nodeAfter = simnet.callReadOnlyFn(
      "node-registry",
      "get-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(nodeAfter.result).toBeNone();
  });

  it("revokes authorization when node is removed", () => {
    // Register and approve a node
    simnet.callPublicFn(
      "node-registry",
      "register-node",
      [samplePublicKey, sampleEndpoint],
      wallet1
    );

    // Approve the node (only owner can do this)
    const approveResult = simnet.callPublicFn(
      "node-registry",
      "approve-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(approveResult.result).toBeOk(Cl.bool(true));

    // Verify node is authorized
    const isAuthorizedBefore = simnet.callReadOnlyFn(
      "node-registry",
      "is-authorized",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(isAuthorizedBefore.result).toBeBool(true);

    // Remove the node
    simnet.callPublicFn(
      "node-registry",
      "remove-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );

    // Verify authorization is revoked
    const isAuthorizedAfter = simnet.callReadOnlyFn(
      "node-registry",
      "is-authorized",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(isAuthorizedAfter.result).toBeBool(false);
  });

  it("allows node to remove itself (self-remove)", () => {
    // Register a node as wallet1
    simnet.callPublicFn(
      "node-registry",
      "register-node",
      [samplePublicKey, sampleEndpoint],
      wallet1
    );

    // Verify node exists
    const nodeBefore = simnet.callReadOnlyFn(
      "node-registry",
      "get-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(nodeBefore.result).not.toBeNone();

    // Node removes itself
    const removeResult = simnet.callPublicFn(
      "node-registry",
      "remove-node",
      [Cl.standardPrincipal(wallet1)],
      wallet1
    );
    expect(removeResult.result).toBeOk(Cl.bool(true));

    // Verify node no longer exists
    const nodeAfter = simnet.callReadOnlyFn(
      "node-registry",
      "get-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(nodeAfter.result).toBeNone();
  });

  it("prevents unauthorized user from removing a node", () => {
    // Register a node as wallet1
    simnet.callPublicFn(
      "node-registry",
      "register-node",
      [samplePublicKey, sampleEndpoint],
      wallet1
    );

    // wallet2 (not owner, not the node) tries to remove wallet1's node
    const removeResult = simnet.callPublicFn(
      "node-registry",
      "remove-node",
      [Cl.standardPrincipal(wallet1)],
      wallet2
    );
    expect(removeResult.result).toBeErr(Cl.uint(100)); // ERR-UNAUTHORIZED

    // Verify node still exists
    const nodeAfter = simnet.callReadOnlyFn(
      "node-registry",
      "get-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(nodeAfter.result).not.toBeNone();
  });

  it("fails when trying to remove non-existent node", () => {
    // Try to remove a node that was never registered
    const removeResult = simnet.callPublicFn(
      "node-registry",
      "remove-node",
      [Cl.standardPrincipal(wallet2)],
      deployer
    );
    expect(removeResult.result).toBeErr(Cl.uint(101)); // ERR-NODE-NOT-FOUND
  });

  it("decrements node count after removal", () => {
    // Register a node
    simnet.callPublicFn(
      "node-registry",
      "register-node",
      [samplePublicKey, sampleEndpoint],
      wallet1
    );

    // Check node count
    const countBefore = simnet.callReadOnlyFn(
      "node-registry",
      "get-node-count",
      [],
      deployer
    );
    expect(countBefore.result).toEqual(Cl.uint(1));

    // Remove the node
    simnet.callPublicFn(
      "node-registry",
      "remove-node",
      [Cl.standardPrincipal(wallet1)],
      deployer
    );

    // Check node count decreased
    const countAfter = simnet.callReadOnlyFn(
      "node-registry",
      "get-node-count",
      [],
      deployer
    );
    expect(countAfter.result).toEqual(Cl.uint(0));
  });
});
