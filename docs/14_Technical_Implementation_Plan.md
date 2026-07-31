# Technical Implementation Plan: MXit 2.0

## 1. Engineering Team Structure
To build MXit 2.0 efficiently, we require 4 distinct squads:
- **Core Platform Squad**: Backend (NestJS, Kafka, ScyllaDB) and Real-time messaging (MQTT).
- **Fintech Squad**: Masheleni wallet, XRPL integration, KYC/AML compliance.
- **Client Squad**: React Native / Expo developers focusing on Android, iOS, and Web.
- **AI & Data Squad**: RAG architecture, ML Ops, local model optimization (TensorFlow Lite).

## 2. Technology Stack Justification
- **Frontend**: *React Native* (or React + Capacitor). Allows a single codebase to output highly performant Android and iOS apps, crucial for rapid iteration.
- **Backend API**: *NestJS* (TypeScript). Strong typing, excellent modularity, and easy integration with GraphQL and gRPC.
- **Real-Time**: *EMQX* (MQTT over WebSockets). MQTT is built for IoT—meaning it handles unreliable, low-bandwidth mobile networks significantly better than standard WebSockets.
- **Database**: *ScyllaDB* (Cassandra clone in C++). Required for the immense write-throughput of millions of chat messages. *PostgreSQL* for relational truth (users, money).

## 3. Implementation Phases

### Month 1: Foundation
- Setup AWS EKS infrastructure and CI/CD pipelines.
- Implement the Auth Service (JWT, OTP) and basic User Profiles.
- Define Protobufs / GraphQL schemas.

### Month 2: Core Messaging
- Deploy EMQX broker.
- Build 1-on-1 messaging with offline queuing and sync.
- Develop the base UI component library (Design System).

### Month 3: MultiMX & Wallet Prototype
- Implement group chat data structures.
- Integrate the XRPL SDK for the Masheleni backend.
- Build the UI flows for custodial vs. self-custodial onboarding.

### Month 4: AI & Mini-App Scaffold
- Deploy the AI Moderation microservice (Kafka consumer).
- Create the WebView bridge for the Mini-App SDK.
- Internal alpha testing of the complete flow.

### Month 5: Polish & Security Audit
- E2EE implementation finalization.
- External penetration testing on the Wallet and Auth services.
- Performance optimization for low-end Android devices.
