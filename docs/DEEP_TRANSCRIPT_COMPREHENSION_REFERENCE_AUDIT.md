# Deep Transcript Comprehension Reference Audit

## References Inspected

- LlamaIndex Sub Question Query Engine: https://developers.llamaindex.ai/python/examples/query_engine/sub_question_query_engine/
- LangChain parent/multi-vector retriever references: https://reference.langchain.com/python/langchain-classic/retrievers/parent_document_retriever
- Microsoft GraphRAG: https://github.com/microsoft/graphrag
- GraphRAG docs: https://microsoft.github.io/graphrag/
- RAGFlow: https://github.com/infiniflow/ragflow
- AWS advanced summarization sample: https://github.com/aws-samples/llm-based-advanced-summarization
- Ollama Transcriber: https://github.com/chumphrey-cmd/Ollama-Transcriber
- ownscribe: https://github.com/paberr/ownscribe
- Meetily: https://github.com/Zackriya-Solutions/meetily
- local-whisper: https://github.com/luisalima/local-whisper

## Useful Patterns

LlamaIndex Sub Question Query Engine demonstrates decomposing a complex question into sub-questions, gathering intermediate answers, and synthesizing a final response. OpenStem should adapt the concept, not the dependency, for first pass.

LangChain retriever patterns show why parent chunks and multiple query views matter. OpenStem should keep chronology and parent transcript context before adding embeddings.

GraphRAG and RAGFlow show richer document/context layers, but they are too heavy for OpenStem's first transcript workflow pass.

Local transcription projects show that Whisper plus a local LLM is a practical privacy-first pattern, but OpenStem must not claim model execution until local provider wiring exists.

## Failure Modes

- Keyword-only retrieval can miss global transcript meaning.
- Sub-question decomposition without evidence retrieval can produce plausible unsupported answers.
- Deep Read without strict section output rules can produce rambling summaries.
- External RAG frameworks can increase install size, runtime complexity, and cloud confusion.

## OpenStem Decision

Use OpenStem-native lightweight services first:

- deterministic chunking,
- context map JSON,
- sub-question planning,
- simple local keyword/evidence index,
- answer synthesis policy,
- optional local embeddings later.

Do not add LangChain, LlamaIndex, GraphRAG, Chroma, Qdrant, LanceDB, or RAGFlow by default.
