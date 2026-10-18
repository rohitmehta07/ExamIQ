import React, { useState } from 'react';
import { X, CheckCircle, Award, HelpCircle } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SUSSurveyModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [q1, setQ1] = useState(5);
  const [q2, setQ2] = useState(5);
  const [q3, setQ3] = useState(5);
  const [q4, setQ4] = useState(5);
  const [q5, setQ5] = useState(5);
  
  // 10 SUS Standard Statements (Scale 1 = Strongly Disagree, 5 = Strongly Agree)
  const [susScores, setSusScores] = useState<number[]>([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]);
  const [qualitative, setQualitative] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  if (!isOpen) return null;

  const susStatements = [
    "1. I think that I would like to use this system frequently before university exams.",
    "2. I found the system unnecessarily complex.",
    "3. I thought the system was easy to use.",
    "4. I think that I would need the support of a technical person to be able to use this system.",
    "5. I found the various functions in this system were well integrated.",
    "6. I thought there was too much inconsistency in this system.",
    "7. I would imagine that most students would learn to use this system very quickly.",
    "8. I found the system very cumbersome to use.",
    "9. I felt very confident using the system.",
    "10. I needed to learn a lot of things before I could get going with this system."
  ];

  // Calculate live preview SUS score
  const oddSum = susScores.filter((_, idx) => idx % 2 === 0).reduce((acc, v) => acc + (v - 1), 0);
  const evenSum = susScores.filter((_, idx) => idx % 2 !== 0).reduce((acc, v) => acc + (5 - v), 0);
  const liveSus = Math.round((oddSum + evenSum) * 2.5 * 10) / 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.submitFeedback({
        q1_ease_of_use: q1,
        q2_recommendation_relevance: q2,
        q3_exam_pattern_help: q3,
        q4_answer_coach_help: q4,
        q5_would_use: q5,
        sus_scores: susScores,
        qualitative_feedback: qualitative,
      });
      setSubmittedResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(`Error submitting feedback: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-600 text-white">
          <div className="flex items-center space-x-2.5">
            <Award className="w-5 h-5 text-indigo-200" />
            <div>
              <h3 className="text-base font-bold">HCI Usability & SUS Research Questionnaire</h3>
              <p className="text-xs text-indigo-100">Standard System Usability Scale (SUS) & Academic Feedback</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedResult ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-800">Feedback Recorded!</h4>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto">
              <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Your System Usability Score</span>
              <span className="text-4xl font-extrabold text-indigo-600 font-mono">{submittedResult.calculated_sus}</span>
              <span className="text-sm text-slate-400"> / 100</span>
              <p className="text-xs text-slate-600 mt-2">
                {submittedResult.calculated_sus >= 84 ? 'Grade A+ (World-Class Usability)' : 'Grade A (Excellent Usability)'}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Responses are anonymized and aggregated for human-computer interaction (HCI) research and project evaluation.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Live Score Banner */}
            <div className="flex items-center justify-between p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div>
                <span className="text-xs font-bold text-indigo-900 block">Live SUS Metric Preview</span>
                <span className="text-xs text-indigo-600">Calculated mathematically from the 10 SUS items below</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-700 font-mono">{liveSus}</span>
                <span className="text-xs text-indigo-500">/100</span>
              </div>
            </div>

            {/* Core 5 Questions */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Core Experience Ratings (1 = Low, 5 = High)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 block mb-2">1. Ease of Use</label>
                  <div className="flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setQ1(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${q1 === val ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 block mb-2">2. Recommendations Relevance</label>
                  <div className="flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setQ2(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${q2 === val ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 block mb-2">3. Exam Pattern Analysis Utility</label>
                  <div className="flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setQ3(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${q3 === val ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700 block mb-2">4. Answer Writing Guidance Help</label>
                  <div className="flex justify-between items-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setQ4(val)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${q4 === val ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 10 SUS Standard Scale */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">System Usability Scale (SUS) Standard Items</h4>
              <p className="text-xs text-slate-500">Rate from 1 (Strongly Disagree) to 5 (Strongly Agree):</p>
              
              <div className="space-y-2.5">
                {susStatements.map((stmt, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-slate-700 font-medium pr-3">{stmt}</span>
                    <div className="flex space-x-1.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((sVal) => (
                        <button
                          type="button"
                          key={sVal}
                          onClick={() => {
                            const updated = [...susScores];
                            updated[idx] = sVal;
                            setSusScores(updated);
                          }}
                          className={`w-7 h-7 rounded text-xs font-bold transition ${susScores[idx] === sVal ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border text-slate-600 hover:bg-slate-100'}`}
                        >
                          {sVal}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Qualitative Feedback & Observations (Optional)
              </label>
              <textarea
                value={qualitative}
                onChange={(e) => setQualitative(e.target.value)}
                placeholder="Share your thoughts on the study plan relevance, answer writing feedback, or UI clarity..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Submit Anonymous Survey'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
