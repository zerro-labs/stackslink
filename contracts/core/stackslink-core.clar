;; title: stackslink-core
;; version: 0.1.0
;; summary: Core logic for StacksLink oracle requests and fulfillment
;; description: Handles the lifecycle of an oracle request, from initiation by a consumer to fulfillment by a node.

;; traits
(use-trait oracle-trait .oracle-trait.oracle-trait)

;; constants
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-REQUEST-EXPIRED (err u101))
(define-constant ERR-REQUEST-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PAYMENT (err u103))

(define-constant MIN-CONFIRMATIONS u3)
(define-constant REQUEST-EXPIRY-BLOCKS u144) ;; ~24 hours

;; data vars
(define-data-var request-nonce uint u0)

;; data maps
(define-map requests
    uint
    {
        requester: principal,
        callback-contract: principal,
        callback-function: (string-ascii 30),
        status: (string-ascii 20),
    }
)

;; public functions

(define-public (request-data
        (job-id uint)
        (callback-contract principal)
        (callback-function (string-ascii 30))
        (payment uint)
    )
    (begin
        ;; 1. Validate payment
        (asserts! (> payment u0) ERR-INVALID-PAYMENT)
        (try! (stx-transfer? payment tx-sender (as-contract tx-sender)))

        ;; 2. Generate request ID
        ;; TODO: Generate request ID

        ;; 3. Store request details
        ;; TODO: Store request details

        ;; 4. Emit event for nodes to pick up
        ;; TODO: Emit event for nodes to pick up

        (ok u0)
    )
)

;; TODO: fulfill-request
;; Input: request-id, data, signature/proof
;; Logic:
;; 1. Validate sender is authorized node
;; 2. Validate request exists and is pending
;; 3. Call the callback function on the consumer contract
;; 4. Update request status to fulfilled

;; read only functions

;; TODO: get-request
;; Input: request-id
;; Output: request details
