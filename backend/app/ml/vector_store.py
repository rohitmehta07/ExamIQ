import re
import numpy as np
from typing import List, Dict, Any, Optional, Set
from app.ml.embedding_engine import embedding_engine

class VectorStore:
    def __init__(self):
        self.chunk_ids: List[int] = []
        self.metadata: List[Dict[str, Any]] = []
        self.vectors: Optional[np.ndarray] = None

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """
        chunks: List of dicts with:
        id, content, document_id, document_name, page_number, doc_category, topic, subject_id, user_id
        """
        if not chunks:
            return

        texts = [c["content"] for c in chunks]
        new_vecs = embedding_engine.encode(texts)

        for i, c in enumerate(chunks):
            self.chunk_ids.append(c["id"])
            self.metadata.append({
                "chunk_id": c["id"],
                "document_id": c.get("document_id", 0),
                "subject_id": c.get("subject_id"),
                "user_id": c.get("user_id"),
                "document_name": c.get("document_name", "Academic Document"),
                "page_number": c.get("page_number", 1),
                "doc_category": c.get("doc_category", "LECTURE_NOTES"),
                "topic": c.get("topic", "General"),
                "content": c["content"]
            })

        if self.vectors is None:
            self.vectors = new_vecs
        else:
            self.vectors = np.vstack([self.vectors, new_vecs])

    def remove_document(self, doc_id: int):
        """Remove all chunks and vector rows associated with a deleted document."""
        if not self.metadata:
            return

        keep_indices = [i for i, meta in enumerate(self.metadata) if meta.get("document_id") != doc_id]
        if len(keep_indices) == len(self.metadata):
            return  # Nothing to remove

        self.chunk_ids = [self.chunk_ids[i] for i in keep_indices]
        self.metadata = [self.metadata[i] for i in keep_indices]

        if self.vectors is not None:
            if keep_indices:
                self.vectors = self.vectors[keep_indices]
            else:
                self.vectors = None

    def remove_subject(self, subject_id: int):
        """Remove all chunks associated with a deleted subject."""
        if not self.metadata:
            return

        keep_indices = [i for i, meta in enumerate(self.metadata) if meta.get("subject_id") != subject_id]
        if len(keep_indices) == len(self.metadata):
            return

        self.chunk_ids = [self.chunk_ids[i] for i in keep_indices]
        self.metadata = [self.metadata[i] for i in keep_indices]

        if self.vectors is not None:
            if keep_indices:
                self.vectors = self.vectors[keep_indices]
            else:
                self.vectors = None

    def search(
        self,
        query: str,
        top_k: int = 5,
        subject_id: Optional[int] = None,
        user_id: Optional[int] = None,
        valid_doc_ids: Optional[Set[int]] = None,
        search_mode: str = "HYBRID"
    ) -> List[Dict[str, Any]]:
        """
        Retrieves search results filtered strictly before ranking against subject_id, user_id, and valid_doc_ids.
        Supports HYBRID, SEMANTIC, and KEYWORD search modes.
        """
        if self.vectors is None or len(self.metadata) == 0:
            return []

        # Find eligible indices strictly BEFORE computing or sorting top results
        candidate_indices = []
        for idx, meta in enumerate(self.metadata):
            if valid_doc_ids is not None and meta.get("document_id") not in valid_doc_ids:
                continue
            if subject_id is not None and meta.get("subject_id") != subject_id:
                continue
            if user_id is not None and meta.get("user_id") != user_id:
                continue
            candidate_indices.append(idx)

        if not candidate_indices:
            return []

        q_clean = query.strip().lower()
        tokens = [t for t in re.findall(r"\w+", q_clean) if len(t) > 1]
        mode = search_mode.upper() if search_mode else "HYBRID"

        matched_tokens_map: Dict[int, List[str]] = {}

        if mode == "KEYWORD":
            active_candidates = []
            active_scores = []
            for idx in candidate_indices:
                content_lower = self.metadata[idx]["content"].lower()
                matched = [t for t in tokens if t in content_lower]
                matched_tokens_map[idx] = matched
                if matched:
                    token_overlap = len(matched) / max(1, len(tokens))
                    phrase_bonus = 0.35 if (len(q_clean) > 3 and q_clean in content_lower) else 0.0
                    term_freq = sum(content_lower.count(t) for t in matched)
                    tf_boost = min(0.2, (term_freq - len(matched)) * 0.04)
                    kw_score = min(1.0, token_overlap * 0.65 + phrase_bonus + tf_boost)
                    active_candidates.append(idx)
                    active_scores.append(kw_score)

            if not active_candidates:
                return []

            final_scores = np.array(active_scores)
            candidate_indices = active_candidates
            top_local_indices = np.argsort(final_scores)[::-1][:top_k]

        elif mode == "SEMANTIC":
            query_vec = embedding_engine.encode([query])[0]
            sub_vectors = self.vectors[candidate_indices]
            scores = np.dot(sub_vectors, query_vec)
            final_scores = np.clip((scores + 1.0) / 2.0, 0.0, 1.0)
            top_local_indices = np.argsort(final_scores)[::-1][:top_k]
            for idx in candidate_indices:
                content_lower = self.metadata[idx]["content"].lower()
                matched_tokens_map[idx] = [t for t in tokens if t in content_lower]

        else:  # HYBRID (default)
            query_vec = embedding_engine.encode([query])[0]
            sub_vectors = self.vectors[candidate_indices]
            dense_scores = np.dot(sub_vectors, query_vec)
            norm_dense = np.clip((dense_scores + 1.0) / 2.0, 0.0, 1.0)

            hybrid_scores = []
            for i, idx in enumerate(candidate_indices):
                content_lower = self.metadata[idx]["content"].lower()
                matched = [t for t in tokens if t in content_lower]
                matched_tokens_map[idx] = matched
                token_overlap = len(matched) / max(1, len(tokens))
                phrase_bonus = 0.2 if (len(q_clean) > 3 and q_clean in content_lower) else 0.0
                kw_score = min(1.0, token_overlap * 0.75 + phrase_bonus)
                hybrid = (norm_dense[i] * 0.6) + (kw_score * 0.4)
                hybrid_scores.append(hybrid)

            final_scores = np.array(hybrid_scores)
            top_local_indices = np.argsort(final_scores)[::-1][:top_k]

        results = []
        for local_idx in top_local_indices:
            orig_idx = candidate_indices[local_idx]
            raw_score = float(final_scores[local_idx])
            norm_score = max(0.0, min(1.0, raw_score))

            meta = self.metadata[orig_idx]
            snippet = meta["content"]
            if len(snippet) > 280:
                snippet = snippet[:280] + "..."

            if norm_score >= 0.70:
                label = "Highly Relevant"
            elif norm_score >= 0.45:
                label = "Relevant"
            else:
                label = "Contextual"

            results.append({
                "document_id": meta["document_id"],
                "document_name": meta["document_name"],
                "page_number": meta["page_number"],
                "snippet": snippet,
                "similarity_score": round(norm_score, 3),
                "relevance_label": label,
                "doc_category": meta["doc_category"],
                "topic": meta["topic"],
                "subject_id": meta.get("subject_id"),
                "matched_terms": matched_tokens_map.get(orig_idx, []),
                "search_mode": mode
            })

        return results

    def clear(self):
        self.chunk_ids = []
        self.metadata = []
        self.vectors = None

vector_store = VectorStore()
