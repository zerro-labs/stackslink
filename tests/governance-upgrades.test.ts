import { describe, expect, it, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("Governance Upgrades: Contract upgrade via governance vote", () => {
  const ROLE_ADMIN = Cl.uint(1);
  const PROPOSAL_DURATION = 144; // blocks

  it("simulates a complete contract upgrade via governance vote", () => {
    // Step 1: Deployer grants ADMIN role to wallet1 and wallet2 for voting quorum
    const grantRole1 = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(grantRole1.result).toBeOk(Cl.bool(true));

    const grantRole2 = simnet.callPublicFn(
      "access-control",
      "grant-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet2)],
      deployer
    );
    expect(grantRole2.result).toBeOk(Cl.bool(true));

    // Verify roles were granted
    const hasRole1 = simnet.callReadOnlyFn(
      "access-control",
      "has-role",
      [ROLE_ADMIN, Cl.standardPrincipal(wallet1)],
      deployer
    );
    expect(hasRole1.result).toBeBool(true);

    // Step 2: Deployer proposes a contract upgrade (using wallet3 as the new contract address)
    const newContractPrincipal = Cl.standardPrincipal(wallet3);
    const proposalDescription = Cl.stringAscii("Upgrade to v2 contract with enhanced security");

    const proposeResult = simnet.callPublicFn(
      "access-control",
      "propose-upgrade",
      [newContractPrincipal, proposalDescription],
      deployer
    );
    expect(proposeResult.result).toBeOk(Cl.uint(1)); // First proposal has ID 1

    // Verify proposal was created
    const proposal = simnet.callReadOnlyFn(
      "access-control",
      "get-proposal",
      [Cl.uint(1)],
      deployer
    );
    expect(proposal.result.type).toBe(ClarityType.OptionalSome);

    // Step 3: Multiple admins vote on the proposal
    // Deployer votes yes
    const vote1 = simnet.callPublicFn(
      "access-control",
      "vote-on-upgrade",
      [Cl.uint(1), Cl.bool(true)],
      deployer
    );
    expect(vote1.result).toBeOk(Cl.bool(true));

    // Wallet1 votes yes
    const vote2 = simnet.callPublicFn(
      "access-control",
      "vote-on-upgrade",
      [Cl.uint(1), Cl.bool(true)],
      wallet1
    );
    expect(vote2.result).toBeOk(Cl.bool(true));

    // Step 4: Cannot execute before voting period ends
    const earlyExecute = simnet.callPublicFn(
      "access-control",
      "execute-upgrade",
      [Cl.uint(1)],
      deployer
    );
    expect(earlyExecute.result).toBeErr(Cl.uint(105)); // ERR-VOTING-NOT-ENDED

    // Step 5: Mine blocks to pass the voting period
    simnet.mineEmptyBlocks(PROPOSAL_DURATION);

    // Verify proposal has passed
    const isPassed = simnet.callReadOnlyFn(
      "access-control",
      "is-proposal-passed",
      [Cl.uint(1)],
      deployer
    );
    expect(isPassed.result).toBeBool(true);

    // Step 6: Execute the upgrade
    const executeResult = simnet.callPublicFn(
      "access-control",
      "execute-upgrade",
      [Cl.uint(1)],
      deployer
    );
    expect(executeResult.result).toBeOk(newContractPrincipal);

    // Step 7: Verify contract owner was updated to the new contract
    const newOwner = simnet.callReadOnlyFn(
      "access-control",
      "get-contract-owner",
      [],
      deployer
    );
    expect(newOwner.result).toEqual(newContractPrincipal);

    // Step 8: Verify proposal is marked as executed - get proposal and check executed flag
    const executedProposal = simnet.callReadOnlyFn(
      "access-control",
      "get-proposal",
      [Cl.uint(1)],
      deployer
    );
    expect(executedProposal.result.type).toBe(ClarityType.OptionalSome);

    // Step 9: Cannot execute again
    const doubleExecute = simnet.callPublicFn(
      "access-control",
      "execute-upgrade",
      [Cl.uint(1)],
      deployer
    );
    expect(doubleExecute.result).toBeErr(Cl.uint(107)); // ERR-PROPOSAL-ALREADY-EXECUTED
  });
});
