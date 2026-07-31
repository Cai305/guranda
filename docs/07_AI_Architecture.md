# AI Architecture: MXit 2.0

## 1. Overview
The AI layer is designed to be cost-effective, leveraging a mix of edge computing (on-device), self-hosted open-source LLMs, and API-based models (e.g., OpenAI) for complex reasoning.

## 2. On-Device AI (Edge)
To save bandwidth and reduce latency, small models run locally on the user's device (TensorFlow Lite / ExecuTorch):
- **Smart Replies**: Suggesting quick 2-3 word replies to incoming messages.
- **Voice Activity Detection (VAD)**: Triggering voice notes.
- **Basic Image Enhancement**: Improving low-light photos before upload.

## 3. Server-Side AI (Self-Hosted LLMs)
Self-hosted models (e.g., Llama 3 8B, Mistral) deployed on GPU clusters for high-volume, low-cost tasks:
- **Toxicity & Spam Detection**: Scanning public chat rooms and reported messages.
- **Translation**: Real-time translation between African languages (Swahili, Zulu, Yoruba) and English/French.
- **Content Categorization**: Sorting the unified inbox.

## 4. RAG Architecture (Retrieval-Augmented Generation)
Used for the **MXit AI Assistant**:
- **Vector Database**: Pinecone or Milvus.
- **Data Sources**: Mini-App directories, public government service FAQs, and marketplace listings.
- **Flow**: User asks a question -> query embedded -> semantic search in Vector DB -> context passed to LLM (OpenAI GPT-4o or Llama 3 70B) -> response generated.

## 5. Privacy & Data Handling
- **Anonymization**: PII is scrubbed from messages before being sent to cloud AI models.
- **Opt-In**: Users must explicitly opt-in for AI to summarize their private E2EE chats (this occurs by decrypting locally and sending securely to the AI service, or running the summarization locally).
