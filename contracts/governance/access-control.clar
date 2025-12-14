
;; title: access-control
;; version: 0.1.0
;; summary: Governance and access control module
;; description: Manages roles and permissions for the StacksLink protocol.

;; constants
(define-constant ROLE-ADMIN u1)
(define-constant ROLE-OPERATOR-MANAGER u2)
(define-constant ROLE-UPGRADER u3)

(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-INVALID-ROLE (err u101))

;; data vars
(define-data-var contract-owner principal tx-sender)

;; data maps
(define-map roles { account: principal, role: uint } bool)

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

;; read only functions

(define-read-only (has-role (role uint) (account principal))
    (default-to false (map-get? roles { account: account, role: role }))
)

(define-read-only (get-contract-owner)
    (var-get contract-owner)
)
