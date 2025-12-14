
;; title: access-control
;; version: 0.1.0
;; summary: Governance and access control module
;; description: Manages roles and permissions for the StacksLink protocol with governance-based upgrades.

;; constants
(define-constant ROLE-ADMIN u1)
(define-constant ROLE-OPERATOR-MANAGER u2)
(define-constant ROLE-UPGRADER u3)

(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-INVALID-ROLE (err u101))
(define-constant ERR-PROPOSAL-NOT-FOUND (err u102))
(define-constant ERR-ALREADY-VOTED (err u103))
(define-constant ERR-VOTING-ENDED (err u104))
(define-constant ERR-VOTING-NOT-ENDED (err u105))
(define-constant ERR-PROPOSAL-NOT-PASSED (err u106))
(define-constant ERR-PROPOSAL-ALREADY-EXECUTED (err u107))
(define-constant ERR-INVALID-NEW-CONTRACT (err u108))

(define-constant PROPOSAL-DURATION u144) ;; ~24 hours in blocks
(define-constant QUORUM-THRESHOLD u2) ;; Minimum votes required

;; data vars
(define-data-var contract-owner principal tx-sender)
(define-data-var proposal-nonce uint u0)

;; data maps
(define-map roles { account: principal, role: uint } bool)

(define-map upgrade-proposals uint 
    {
        proposer: principal,
        new-contract: principal,
        description: (string-ascii 256),
        end-height: uint,
        yes-votes: uint,
        no-votes: uint,
        executed: bool
    }
)

(define-map proposal-votes { proposal-id: uint, voter: principal } bool)

;; private functions

(define-private (is-admin (account principal))
    (or 
        (is-eq account (var-get contract-owner))
        (default-to false (map-get? roles { account: account, role: ROLE-ADMIN }))
    )
)

;; public functions

(define-public (grant-role (role uint) (account principal))
    (begin
        (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
        (asserts! (or (is-eq role ROLE-ADMIN) (is-eq role ROLE-OPERATOR-MANAGER) (is-eq role ROLE-UPGRADER)) ERR-INVALID-ROLE)
        (ok (map-set roles { account: account, role: role } true))
    )
)

(define-public (revoke-role (role uint) (account principal))
    (begin
        (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
        (asserts! (or (is-eq role ROLE-ADMIN) (is-eq role ROLE-OPERATOR-MANAGER) (is-eq role ROLE-UPGRADER)) ERR-INVALID-ROLE)
        (ok (map-delete roles { account: account, role: role }))
    )
)

;; Governance: Propose a contract upgrade
(define-public (propose-upgrade (new-contract principal) (description (string-ascii 256)))
    (let 
        (
            (proposal-id (+ (var-get proposal-nonce) u1))
        )
        (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
        (map-set upgrade-proposals proposal-id 
            {
                proposer: tx-sender,
                new-contract: new-contract,
                description: description,
                end-height: (+ stacks-block-height PROPOSAL-DURATION),
                yes-votes: u0,
                no-votes: u0,
                executed: false
            }
        )
        (var-set proposal-nonce proposal-id)
        (print { event: "UpgradeProposed", proposal-id: proposal-id, new-contract: new-contract, proposer: tx-sender })
        (ok proposal-id)
    )
)

;; Governance: Vote on an upgrade proposal
(define-public (vote-on-upgrade (proposal-id uint) (vote-for bool))
    (let 
        (
            (proposal (unwrap! (map-get? upgrade-proposals proposal-id) ERR-PROPOSAL-NOT-FOUND))
        )
        (asserts! (is-admin tx-sender) ERR-UNAUTHORIZED)
        (asserts! (< stacks-block-height (get end-height proposal)) ERR-VOTING-ENDED)
        (asserts! (is-none (map-get? proposal-votes { proposal-id: proposal-id, voter: tx-sender })) ERR-ALREADY-VOTED)
        
        (map-set proposal-votes { proposal-id: proposal-id, voter: tx-sender } vote-for)
        
        (if vote-for
            (map-set upgrade-proposals proposal-id (merge proposal { yes-votes: (+ (get yes-votes proposal) u1) }))
            (map-set upgrade-proposals proposal-id (merge proposal { no-votes: (+ (get no-votes proposal) u1) }))
        )
        
        (print { event: "VoteCast", proposal-id: proposal-id, voter: tx-sender, vote-for: vote-for })
        (ok true)
    )
)

;; Governance: Execute an approved upgrade proposal
(define-public (execute-upgrade (proposal-id uint))
    (let 
        (
            (proposal (unwrap! (map-get? upgrade-proposals proposal-id) ERR-PROPOSAL-NOT-FOUND))
        )
        (asserts! (>= stacks-block-height (get end-height proposal)) ERR-VOTING-NOT-ENDED)
        (asserts! (not (get executed proposal)) ERR-PROPOSAL-ALREADY-EXECUTED)
        (asserts! (>= (get yes-votes proposal) QUORUM-THRESHOLD) ERR-PROPOSAL-NOT-PASSED)
        (asserts! (> (get yes-votes proposal) (get no-votes proposal)) ERR-PROPOSAL-NOT-PASSED)
        
        ;; Mark as executed and update contract owner
        (map-set upgrade-proposals proposal-id (merge proposal { executed: true }))
        (var-set contract-owner (get new-contract proposal))
        
        (print { event: "UpgradeExecuted", proposal-id: proposal-id, new-contract: (get new-contract proposal) })
        (ok (get new-contract proposal))
    )
)

;; read only functions

(define-read-only (has-role (role uint) (account principal))
    (default-to false (map-get? roles { account: account, role: role }))
)

(define-read-only (get-contract-owner)
    (var-get contract-owner)
)

(define-read-only (get-proposal (proposal-id uint))
    (map-get? upgrade-proposals proposal-id)
)

(define-read-only (get-proposal-vote (proposal-id uint) (voter principal))
    (map-get? proposal-votes { proposal-id: proposal-id, voter: voter })
)

(define-read-only (is-proposal-passed (proposal-id uint))
    (match (map-get? upgrade-proposals proposal-id)
        proposal (and 
            (>= stacks-block-height (get end-height proposal))
            (>= (get yes-votes proposal) QUORUM-THRESHOLD)
            (> (get yes-votes proposal) (get no-votes proposal))
        )
        false
    )
)
