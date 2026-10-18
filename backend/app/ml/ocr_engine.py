import io
import numpy as np
from PIL import Image
from typing import Tuple, List, Dict, Any

class OCREngine:
    def __init__(self):
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._ocr = RapidOCR()
            except Exception as e:
                print(f"[OCREngine] Warning: RapidOCR initialization failed: {e}")
                self._ocr = None
        return self._ocr

    def extract_from_image_bytes(self, image_bytes: bytes) -> Tuple[str, float, bool, List[Dict[str, Any]]]:
        """
        Runs OCR on image bytes.
        Returns:
            extracted_text (str),
            mean_confidence (float 0.0 - 1.0),
            is_likely_handwritten (bool),
            line_details (list of dicts)
        """
        ocr = self._get_ocr()
        if not ocr:
            return "", 0.0, False, []

        try:
            img = Image.open(io.BytesIO(image_bytes))
            img_np = np.array(img)
            result, _ = ocr(img_np)
            
            if not result:
                return "", 0.0, False, []

            lines = []
            confidences = []
            line_details = []

            for item in result:
                # item: [dt_boxes, text, score]
                box, text, score = item[0], item[1], float(item[2])
                lines.append(text)
                confidences.append(score)
                line_details.append({
                    "text": text,
                    "confidence": round(score, 3),
                    "box": box
                })

            full_text = "\n".join(lines)
            mean_conf = float(np.mean(confidences)) if confidences else 0.0

            # Handwritten detection heuristic:
            # Printed text with RapidOCR typically has confidences > 0.88 with low variance.
            # Handwritten text typically has lower average confidence (< 0.75) and higher variance.
            conf_std = float(np.std(confidences)) if len(confidences) > 1 else 0.0
            is_handwritten = (mean_conf < 0.78 or conf_std > 0.22) and len(lines) > 3

            return full_text, round(mean_conf, 3), is_handwritten, line_details

        except Exception as e:
            print(f"[OCREngine] OCR execution error: {e}")
            return "", 0.0, False, []

ocr_engine = OCREngine()
