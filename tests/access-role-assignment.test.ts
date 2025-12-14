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
});
