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
        (let ((request-id (+ (var-get request-nonce) u1)))
            (var-set request-nonce request-id)

            ;; 3. Store request details
            (map-set requests request-id {
                requester: tx-sender,
                callback-contract: callback-contract,
                callback-function: callback-function,
                status: "pending",
            })

            ;; 4. Emit event for nodes to pick up
            (print {
                event: "OracleRequest",
                request-id: request-id,
                job-id: job-id,
                requester: tx-sender,
                payment: payment,
            })

            (ok request-id)
        )
    )
)

(define-public (fulfill-request
        (request-id uint)
        (data (buff 2048))
        (signature (buff 65))
    )
    (let ((request (unwrap! (map-get? requests request-id) ERR-REQUEST-NOT-FOUND)))
        ;; 1. Validate sender is authorized node
        ;; TODO: Check against node-registry contract
        ;; For now, we'll assume a trusted sender or implement a simple check
        ;; (asserts! (is-authorized tx-sender) ERR-UNAUTHORIZED)

        ;; 2. Validate request exists and is pending
        ;; TODO: Validate request exists and is pending

        ;; 3. Call the callback function on the consumer contract
        ;; TODO: Call the callback function on the consumer contract

        ;; 4. Update request status to fulfilled
        ;; TODO: Update request status to fulfilled

        (ok true)
    )
)

;; read only functions

;; TODO: get-request
;; Input: request-id
;; Output: request details
