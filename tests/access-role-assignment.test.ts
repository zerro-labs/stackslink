import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("Access Control: Role Assignment", () => {
  const ROLE_ADMIN = Cl.uint(1);
  const ROLE_OPERATOR_MANAGER = Cl.uint(2);
  const ROLE_UPGRADER = Cl.uint(3);

  it("allows contract owner to grant ADMIN role", () => {
    // Initially wallet1 should not have admin role
    const hasRoleBefore = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasRoleBefore.result).toBeBool(false);

    // Deployer (contract owner) grants ADMIN role to wallet1
    const grantResult = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantResult.result).toBeOk(Cl.bool(true));

    // Verify wallet1 now has admin role
    const hasRoleAfter = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasRoleAfter.result).toBeBool(true);
  });

  it("prevents non-admin from granting roles", () => {
    // wallet1 (non-admin) tries to grant ADMIN role to wallet2
    const grantResult = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet2)],
      wallet1
    );
    expect(grantResult.result).toBeErr(Cl.uint(100)); // ERR-UNAUTHORIZED

    // Verify wallet2 still does not have admin role
    const hasRole = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet2)],
      deployer
    );
    expect(hasRole.result).toBeBool(false);
  });

  it("allows admin to revoke a role", () => {
    // First, grant OPERATOR_MANAGER role to wallet1
    const grantResult = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_OPERATOR_MANAGER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantResult.result).toBeOk(Cl.bool(true));

    // Verify wallet1 has the role
    const hasRoleBefore = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_OPERATOR_MANAGER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasRoleBefore.result).toBeBool(true);

    // Now revoke the role
    const revokeResult = simnet.callPublicFn(
      "access-control",
      "revoke-role",
      [ROLE_OPERATOR_MANAGER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(revokeResult.result).toBeOk(Cl.bool(true));

    // Verify wallet1 no longer has the role
    const hasRoleAfter = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_OPERATOR_MANAGER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasRoleAfter.result).toBeBool(false);
  });

  it("prevents non-admin from revoking roles", () => {
    // First, grant UPGRADER role to wallet1 (by deployer)
    const grantResult = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_UPGRADER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantResult.result).toBeOk(Cl.bool(true));

    // wallet2 (non-admin) tries to revoke the role from wallet1
    const revokeResult = simnet.callPublicFn(
      "access-control",
      "revoke-role",
      [ROLE_UPGRADER, Cl.standardPrincipal(wallet1)],
      wallet2
    );
    expect(revokeResult.result).toBeErr(Cl.uint(100)); // ERR-UNAUTHORIZED

    // Verify wallet1 still has the role
    const hasRole = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_UPGRADER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasRole.result).toBeBool(true);
  });

  it("allows granting multiple different roles to same account", () => {
    // Grant all three roles to wallet1
    const grantAdmin = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantAdmin.result).toBeOk(Cl.bool(true));

    const grantOperator = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_OPERATOR_MANAGER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantOperator.result).toBeOk(Cl.bool(true));

    const grantUpgrader = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_UPGRADER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantUpgrader.result).toBeOk(Cl.bool(true));

    // Verify all roles are assigned
    const hasAdmin = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasAdmin.result).toBeBool(true);

    const hasOperator = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_OPERATOR_MANAGER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasOperator.result).toBeBool(true);

    const hasUpgrader = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_UPGRADER, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasUpgrader.result).toBeBool(true);
  });

  it("rejects granting invalid role", () => {
    const INVALID_ROLE = Cl.uint(99);

    // Try to grant an invalid role
    const grantResult = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [INVALID_ROLE, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantResult.result).toBeErr(Cl.uint(101)); // ERR-INVALID-ROLE
  });

  it("rejects revoking invalid role", () => {
    const INVALID_ROLE = Cl.uint(99);

    // Try to revoke an invalid role
    const revokeResult = simnet.callPublicFn(
      "access-control",
      "revoke-role",
      [INVALID_ROLE, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(revokeResult.result).toBeErr(Cl.uint(101)); // ERR-INVALID-ROLE
  });
});
