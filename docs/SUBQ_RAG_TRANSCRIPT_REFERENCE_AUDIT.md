# SubQ RAG Transcript Reference Audit

## Architecture Decision

OpenStem should not add a heavy RAG framework by default.

OpenStem-native lightweight services first.

The first safe architecture is:

Deep Read -> SubQ Planning -> Evidence Retrieval -> Section Answering -> Output Verification -> Plain Text Assembly

## Reference Findings

| Reference                                          | Useful Pattern                                                           | Reason Not Added As Dependency Now                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| LlamaIndex Sub Question Query Engine               | Complex query decomposition into sub-questions and synthesis.            | Heavy framework, provider configuration, and possible cloud defaults require review.         |
| LangChain MultiQuery/Parent/MultiVector retrievers | Multiple query views and parent context retrieval.                       | Adds dependency complexity before OpenStem proves a native transcript path.                  |
| LangGraph                                          | Explicit multi-step workflows.                                           | Useful later for durable graphs, but too broad for first pass.                               |
| Microsoft GraphRAG                                 | Global summaries and graph context for private data.                     | Large indexing pipeline, Python runtime complexity, and not needed for first local scaffold. |
| RAGFlow                                            | Deep document understanding and agent-style RAG.                         | Enterprise-scale stack and too heavy for a desktop transcript prompt scaffold.               |
| AWS advanced summarization sample                  | Map-reduce/refine summarization patterns.                                | Useful reference only; OpenStem can implement smaller native staged summaries first.         |
| Ollama Transcriber                                 | Local Whisper plus Ollama summarization.                                 | Runtime pattern only; OpenStem still needs local provider wiring.                            |
| ownscribe                                          | Local meeting capture, WhisperX, local LLM summary, local output folder. | Useful privacy pattern; not copied.                                                          |
| Meetily                                            | Privacy-first local meeting assistant.                                   | Useful local-first UX reference; not copied.                                                 |
| local-whisper                                      | Fully local Whisper workflow.                                            | Transcription reference only; not a RAG framework.                                           |

## Dependency Report

No dependencies were added.

Heavy frameworks avoided:

- LangChain,
- LlamaIndex,
- LangGraph,
- GraphRAG,
- RAGFlow,
- Chroma,
- Qdrant,
- LanceDB.

Reason: OpenStem can first implement deterministic chunking, local context maps, sub-question plans, local keyword/evidence retrieval, and answer validation without adding large dependency and runtime surfaces.

## Privacy Decision

No cloud RAG by default. No cloud embeddings by default. No cloud vector database by default. No hidden upload. Transcript text is not logged by default.

## Future Upgrade Path

Add local embeddings only after:

- local embedding model is chosen,
- model source/license is documented,
- storage location is local,
- index deletion is available,
- transcript text logging remains disabled,
- cloud sync remains off by default.
