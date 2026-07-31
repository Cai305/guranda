# API Architecture: MXit 2.0

## 1. Overview
The MXit 2.0 backend will utilize a hybrid API architecture to support different operational needs:
- **RESTful APIs**: For standard CRUD operations, authentication, and file uploads.
- **GraphQL**: For fetching complex, nested data structures (e.g., user profiles with recent posts, friends, and wallet balances) minimizing over-fetching for mobile.
- **WebSockets / MQTT**: For real-time bi-directional communication (chat messages, presence, typing indicators).

## 2. API Gateway
All client traffic flows through an API Gateway (e.g., Kong or AWS API Gateway).
- **Responsibilities**: Rate limiting, DDoS protection, SSL termination, and routing.
- **Auth**: Validates JWTs before forwarding requests to downstream microservices.

## 3. Communication Protocols

### 3.1 Real-Time Chat (WebSocket/MQTT)
- **Connection**: Clients maintain a persistent MQTT-over-WebSocket connection for low bandwidth overhead.
- **Topics Structure**:
  - `user/{user_id}/inbox` : Receive incoming messages.
  - `chat/{chat_id}/events` : Receive messages, typing indicators, read receipts for a specific chat.
  - `presence/status` : Subscribe to online/offline events of buddies.

### 3.2 Core Services (REST/GraphQL)
#### User & Auth API
- `POST /api/v1/auth/register` (Handles custody model selection)
- `POST /api/v1/auth/login`
- `GET /api/v1/users/me`

#### Wallet API (Masheleni 2.0)
- `GET /api/v1/wallet/balance`
- `POST /api/v1/wallet/transfer` (If platform-custodial, backend signs; if self-custodial, client submits signed XRPL transaction here).
- `GET /api/v1/wallet/transactions`

#### Mini-App Platform API
- `GET /api/v1/apps/featured`
- `POST /api/v1/apps/{app_id}/session` (Generates a secure token for SSO into the mini-app).

### 3.3 Internal Microservice Communication
- **gRPC**: Used for high-speed, low-latency synchronous communication between internal NestJS microservices.
- **Kafka**: Used for asynchronous event streaming (e.g., "User Registered" event triggering wallet creation, AI analysis of a message for toxicity).

## 4. API Security
- **Authentication**: OAuth 2.0 + JWT.
- **Payload Encryption**: End-to-end encryption (E2EE) payloads for private messages bypass the API gateway's inspection.
- **Versioning**: URI versioning for REST (`/v1/`), Schema evolution for GraphQL.
