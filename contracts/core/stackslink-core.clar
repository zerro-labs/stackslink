;; title: stackslink-core
;; version: 0.1.0
;; summary: Core logic for StacksLink oracle requests and fulfillment
;; description: Handles the lifecycle of an oracle request, from initiation by a consumer to fulfillment by a node.

;; traits
(use-trait oracle-trait .oracle-trait.oracle-trait)

;; constants
;; TODO: Define error constants (e.g., ERR-UNAUTHORIZED, ERR-REQUEST-EXPIRED)
;; TODO: Define system constants (e.g., MIN-CONFIRMATIONS)

;; data vars
;; TODO: Track request IDs (nonce)

;; data maps
;; TODO: Map request-id to request-details (requester, callback, status)

;; public functions

;; TODO: request-data
;; Input: job-id, callback-contract, callback-function, payment
;; Logic:
;; 1. Validate payment
;; 2. Generate request ID
;; 3. Store request details
;; 4. Emit event for nodes to pick up

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
