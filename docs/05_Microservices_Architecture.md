# Microservices Architecture: MXit 2.0

```mermaid
graph TD
    Client[Mobile/Web Clients] --> API_GW[API Gateway Kong/AWS]
    
    API_GW --> Auth_SVC[Auth & Identity Service]
    API_GW --> Chat_SVC[Chat & Messaging Service]
    API_GW --> Wallet_SVC[Wallet & Payments Service]
    API_GW --> Social_SVC[Social Graph Service]
    API_GW --> MiniApp_SVC[Mini-App Orchestrator]
    
    Chat_SVC --> MQTT_Broker[MQTT Broker / Realtime Node]
    Chat_SVC --> AI_Moderation[AI Safety & Moderation Service]
    
    Wallet_SVC --> XRPL_Node[XRPL Node / Connector]
    
    Auth_SVC -.-> DB_Users[(Users DB PostgreSQL)]
    Chat_SVC -.-> DB_Messages[(Messages DB ScyllaDB)]
    Wallet_SVC -.-> DB_Wallet[(Wallet DB PostgreSQL)]
    Social_SVC -.-> DB_Graph[(Graph DB Neo4j)]
    
    Auth_SVC -- gRPC --> Chat_SVC
    Wallet_SVC -- Kafka Event --> Chat_SVC
    
    Kafka((Apache Kafka Event Bus))
    Auth_SVC --> Kafka
    Chat_SVC --> Kafka
    Wallet_SVC --> Kafka
```

## Key Services
1. **Auth & Identity Service**: Handles registration, JWT issuance, and KYC for the wallet.
2. **Chat & Messaging Service**: Manages routing of messages, storing histories, and interfacing with the MQTT broker for real-time delivery.
3. **Wallet & Payments Service (Masheleni)**: Interfaces with the XRPL. Manages platform-custodial wallets and verifies self-custodial transactions.
4. **Social Graph Service**: Manages friends, followers, blocked users, and feed generation.
5. **Mini-App Orchestrator**: Manages the lifecycle, auth tokens, and billing events for 3rd-party mini-apps.
6. **AI Safety & Moderation Service**: Asynchronously consumes message events from Kafka to detect toxicity and flag content.
