import os
import pymupdf
from typing import List, Dict, Any
from app.ml.ocr_engine import ocr_engine

class TextExtractor:
    def extract_document(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts content from a PDF document.
        Detects digital text vs scanned pages, selectively invoking OCR.
        Preserves page numbering and structure.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        # Direct plain-text file handling for .txt formats
        ext = file_path.split(".")[-1].lower() if "." in file_path else ""
        if ext == "txt":
            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    txt_content = f.read()
                return {
                    "page_count": 1,
                    "pages": [{
                        "page_number": 1,
                        "text": txt_content,
                        "ocr_used": False,
                        "ocr_confidence": 1.0,
                        "is_handwritten": False,
                        "char_count": len(txt_content)
                    }],
                    "full_text": txt_content,
                    "ocr_used": False,
                    "ocr_pages_count": 0,
                    "mean_confidence": 1.0,
                    "is_handwritten": False,
                    "is_scanned": False,
                }
            except Exception:
                pass

        doc = pymupdf.open(file_path)
        pages_data: List[Dict[str, Any]] = []
        total_ocr_count = 0
        confidences = []
        handwritten_page_count = 0

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            raw_text = page.get_text()

            # Normal text extraction if digital text exists
            if len(raw_text.strip()) > 50:
                clean_text = raw_text.strip()
                pages_data.append({
                    "page_number": page_num,
                    "text": clean_text,
                    "ocr_used": False,
                    "ocr_confidence": 1.0,
                    "is_handwritten": False,
                    "char_count": len(clean_text)
                })
                confidences.append(1.0)
            else:
                # Scanned or image-based page -> Run OCR
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                ocr_text, mean_conf, is_handwritten, _ = ocr_engine.extract_from_image_bytes(img_bytes)

                pages_data.append({
                    "page_number": page_num,
                    "text": ocr_text,
                    "ocr_used": True,
                    "ocr_confidence": mean_conf,
                    "is_handwritten": is_handwritten,
                    "char_count": len(ocr_text)
                })
                total_ocr_count += 1
                confidences.append(mean_conf)
                if is_handwritten:
                    handwritten_page_count += 1

        doc.close()

        avg_conf = sum(confidences) / len(confidences) if confidences else 1.0
        is_handwritten_doc = handwritten_page_count > (len(pages_data) * 0.4)
        is_scanned_doc = total_ocr_count > (len(pages_data) * 0.5)

        full_doc_text = "\n\n".join([f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages_data])

        return {
            "page_count": len(pages_data),
            "pages": pages_data,
            "full_text": full_doc_text,
            "ocr_used": total_ocr_count > 0,
            "ocr_pages_count": total_ocr_count,
            "mean_confidence": round(avg_conf, 3),
            "is_handwritten": is_handwritten_doc,
            "is_scanned": is_scanned_doc,
        }

    # Backward compatibility alias
    extract_text = extract_document

text_extractor = TextExtractor()

