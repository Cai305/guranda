# Database Schema: MXit 2.0

```mermaid
erDiagram
    USERS {
        uuid id PK
        string username
        string phone_number
        string password_hash
        boolean is_self_custodial
        timestamp created_at
    }
    
    USER_PROFILES {
        uuid user_id FK
        string display_name
        string avatar_url
        string bio
        string status_message
    }
    
    CHATS {
        uuid id PK
        string type "DIRECT, GROUP, CHANNEL"
        string name
        timestamp created_at
    }
    
    CHAT_MEMBERS {
        uuid chat_id FK
        uuid user_id FK
        string role "ADMIN, MOD, MEMBER"
        timestamp joined_at
    }
    
    MESSAGES {
        uuid id PK
        uuid chat_id FK
        uuid sender_id FK
        text content
        string media_url
        boolean is_ai_generated
        timestamp created_at
        timestamp deleted_at
    }
    
    WALLETS {
        uuid id PK
        uuid user_id FK
        string xrpl_address
        string encrypted_seed "Null if self-custodial"
        decimal balance_masheleni
        timestamp created_at
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid wallet_id FK
        string tx_hash
        decimal amount
        string type "SEND, RECEIVE, PAYMENT"
        string status "PENDING, SUCCESS, FAILED"
        timestamp timestamp
    }
    
    MINI_APPS {
        uuid id PK
        string name
        string developer_id
        string entry_url
        boolean is_verified
    }

    USERS ||--o| USER_PROFILES : has
    USERS ||--o{ CHAT_MEMBERS : is_in
    CHATS ||--o{ CHAT_MEMBERS : contains
    CHATS ||--o{ MESSAGES : has
    USERS ||--o{ MESSAGES : sends
    USERS ||--o| WALLETS : owns
    WALLETS ||--o{ TRANSACTIONS : performs
```

### Notes
- **Database Choice**: PostgreSQL for relational data (Users, Wallets, Transactions, Mini-Apps).
- **High-Volume Data**: Messages may be archived into a NoSQL store (e.g., Cassandra/ScyllaDB) for scalability.
- **Caching**: Redis used for active presence, typing indicators, and session states.
