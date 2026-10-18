import os

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD
from typing import List, Dict, Any

class EmbeddingEngine:
    """
    Lightweight, deterministic local semantic embedding engine.
    Uses TF-IDF combined with dense TruncatedSVD projection,
    requiring zero external API keys or heavy GPU downloads.
    """
    def __init__(self, dimension: int = 128):
        self.dimension = dimension
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=5000,
            stop_words="english",
            token_pattern=r"(?u)\b[a-zA-Z0-9_\-\$]+\b"
        )
        self.svd = TruncatedSVD(n_components=min(dimension, 64), random_state=42)
        self.is_fitted = False
        self._corpus_cache: List[str] = []

    def fit(self, texts: List[str]):
        if not texts or len(texts) < 2:
            texts = [
                "cryptography network security encryption decryption ciphertext plaintext",
                "learning with errors lattices quantum post quantum shor grover algorithm",
                "advanced encryption standard data encryption standard feistel cipher rounds",
                "security attacks active passive masquerade replay denial of service"
            ] + list(texts)

        self._corpus_cache = texts
        tfidf_matrix = self.vectorizer.fit_transform(texts)
        n_components = min(self.dimension, 32, tfidf_matrix.shape[1] - 1, tfidf_matrix.shape[0] - 1)
        if n_components > 2:
            self.svd = TruncatedSVD(n_components=n_components, random_state=42)
            self.svd.fit(tfidf_matrix)
        self.is_fitted = True

    def encode(self, texts: List[str]) -> np.ndarray:
        if not self.is_fitted:
            self.fit(texts)

        tfidf_vecs = self.vectorizer.transform(texts)
        if hasattr(self.svd, "components_"):
            try:
                dense_vecs = self.svd.transform(tfidf_vecs)
                # Normalize L2
                norms = np.linalg.norm(dense_vecs, axis=1, keepdims=True)
                norms[norms == 0] = 1.0
                return (dense_vecs / norms).astype(np.float32)
            except Exception:
                pass
        
        # Fallback to direct normalized TF-IDF dense array
        dense = tfidf_vecs.toarray().astype(np.float32)
        norms = np.linalg.norm(dense, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return dense / norms

    def compute_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Computes cosine similarity between two 1D vectors."""
        dot = float(np.dot(vec1, vec2))
        norm1 = float(np.linalg.norm(vec1))
        norm2 = float(np.linalg.norm(vec2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return max(0.0, min(1.0, (dot / (norm1 * norm2) + 1.0) / 2.0))

embedding_engine = EmbeddingEngine()
