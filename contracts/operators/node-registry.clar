
;; title: node-registry
;; version: 0.1.0
;; summary: Registry of authorized node operators
;; description: Manages the list of nodes allowed to fulfill requests and submit data.

;; constants
(define-constant MAX-NODES u100)
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-NODE-NOT-FOUND (err u101))
(define-constant ERR-NODE-ALREADY-EXISTS (err u102))
(define-constant ERR-MAX-NODES-REACHED (err u103))

;; data vars
(define-data-var contract-owner principal tx-sender)
(define-data-var node-count uint u0)

;; data maps
(define-map nodes principal 
    {
        public-key: (buff 33),
        endpoint: (string-ascii 256),
        active: bool,
        registered-at: uint
    }
)

;; private functions

(define-private (is-owner (account principal))
    (is-eq account (var-get contract-owner))
)

;; public functions

(define-public (register-node (public-key (buff 33)) (endpoint (string-ascii 256)))
    (begin
        (asserts! (is-none (map-get? nodes tx-sender)) ERR-NODE-ALREADY-EXISTS)
        (asserts! (< (var-get node-count) MAX-NODES) ERR-MAX-NODES-REACHED)
        (map-set nodes tx-sender {
            public-key: public-key,
            endpoint: endpoint,
            active: false,
            registered-at: stacks-block-height
        })
        (var-set node-count (+ (var-get node-count) u1))
        (print { event: "NodeRegistered", node: tx-sender, endpoint: endpoint })
        (ok true)
    )
)

(define-public (approve-node (node-principal principal))
    (let ((node (unwrap! (map-get? nodes node-principal) ERR-NODE-NOT-FOUND)))
        (asserts! (is-owner tx-sender) ERR-UNAUTHORIZED)
        (map-set nodes node-principal (merge node { active: true }))
        (print { event: "NodeApproved", node: node-principal })
        (ok true)
    )
)

(define-public (remove-node (node-principal principal))
    (let ((node (unwrap! (map-get? nodes node-principal) ERR-NODE-NOT-FOUND)))
        ;; Allow removal by owner OR by the node itself (self-remove)
        (asserts! (or (is-owner tx-sender) (is-eq tx-sender node-principal)) ERR-UNAUTHORIZED)
        (map-delete nodes node-principal)
        (var-set node-count (- (var-get node-count) u1))
        (print { event: "NodeRemoved", node: node-principal, removed-by: tx-sender })
        (ok true)
    )
)

;; read only functions

(define-read-only (is-authorized (node-principal principal))
    (match (map-get? nodes node-principal)
        node (get active node)
        false
    )
)

(define-read-only (get-node (node-principal principal))
    (map-get? nodes node-principal)
)

(define-read-only (get-node-count)
    (var-get node-count)
)

(define-read-only (get-contract-owner)
    (var-get contract-owner)
)
