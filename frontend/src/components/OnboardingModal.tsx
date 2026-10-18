import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ArrowLeft, BookOpen, Calendar, Clock, Upload, Award, Sparkles, Plus } from 'lucide-react';
import { api } from '../services/api';
import { Subject, TopicItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlanGenerated?: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose, onPlanGenerated }) => {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [examDate, setExamDate] = useState('2026-11-25');
  const [studyHours, setStudyHours] = useState(3.0);
  const [prevMarks, setPrevMarks] = useState(0.0);
  const [targetMarks, setTargetMarks] = useState(85.0);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.getSubjects().catch(() => []),
        api.getProfile().catch(() => null)
      ]).then(([userSubs, prof]) => {
        setSubjects(userSubs);
        const activeId = prof?.subject_id || (userSubs.length > 0 ? userSubs[0].id : null);
        setSelectedSubjectId(activeId);

        if (prof) {
          if (prof.exam_date) setExamDate(prof.exam_date);
          if (prof.available_hours_per_day) setStudyHours(prof.available_hours_per_day);
          if (prof.target_marks) setTargetMarks(prof.target_marks);
          if (prof.previous_marks !== undefined) setPrevMarks(prof.previous_marks);
          if (prof.weak_topics && prof.weak_topics.length > 0) setWeakTopics(prof.weak_topics);
          else setWeakTopics([]);
        }

        if (activeId) {
          api.getTopics(activeId).then((topList) => {
            if (topList && topList.length > 0) {
              setAvailableTopics(topList.map((t) => t.name));
            } else {
              setAvailableTopics(['Core Concepts', 'Problem Solving', 'Numerical Analysis', 'Algorithms', 'Theoretical Foundations']);
            }
          }).catch(() => {});
        }
      });
    }
  }, [isOpen]);

  // When selectedSubjectId changes, reload its topics and exam date
  const handleSelectSubject = (sub: Subject) => {
    setSelectedSubjectId(sub.id);
    if (sub.exam_date) setExamDate(sub.exam_date);
    if (sub.target_marks) setTargetMarks(sub.target_marks);
    if (sub.study_hours_per_day) setStudyHours(sub.study_hours_per_day);

    api.getTopics(sub.id).then((topList) => {
      if (topList && topList.length > 0) {
        setAvailableTopics(topList.map((t) => t.name));
      } else {
        setAvailableTopics(['Core Concepts', 'Problem Solving', 'Numerical Analysis', 'Algorithms', 'Theoretical Foundations']);
      }
    }).catch(() => {});
  };

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleToggleTopic = (topic: string) => {
    if (weakTopics.includes(topic)) {
      setWeakTopics(weakTopics.filter((t) => t !== topic));
    } else {
      setWeakTopics([...weakTopics, topic]);
    }
  };

  const handleFinalGenerate = async () => {
    if (!selectedSubjectId) {
      alert('Please add or select a subject first to generate a personalized plan.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update Profile
      await api.updateProfile({
        subject_id: selectedSubjectId,
        exam_date: examDate,
        available_hours_per_day: studyHours,
        previous_marks: prevMarks,
        target_marks: targetMarks,
        weak_topics: weakTopics,
      });

      // 2. Generate Plan for this subject
      await api.generateStudyPlan(selectedSubjectId, examDate, studyHours, targetMarks);
      if (onPlanGenerated) onPlanGenerated();
      onClose();
    } catch (err: any) {
      alert(`Error generating plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentSubjectObj = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Progress Bar */}
        <div className="bg-slate-900 text-white p-6 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              ExamIQ Smart Onboarding &bull; Step {step} of {totalSteps}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Contents */}
        <div className="p-8 space-y-6 overflow-y-auto min-h-[320px]">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 1: Select Active Subject</h3>
                  <p className="text-xs text-slate-500">Pick which subject you want to plan and organize today.</p>
                </div>
              </div>

              {subjects.length > 0 ? (
                <div className="space-y-2.5 pt-2 max-h-56 overflow-y-auto">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectId === sub.id;
                    return (
                      <div
                        key={sub.id}
                        onClick={() => handleSelectSubject(sub)}
                        className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">
                            {sub.name} {sub.code ? `(${sub.code})` : ''}
                          </span>
                          <span className="text-xs text-slate-500">
                            {sub.semester || 'Semester'} &bull; {sub.exam_date ? `Exam: ${sub.exam_date}` : 'No date set'}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                  <p className="text-sm font-bold text-slate-700">No subjects added yet</p>
                  <p className="text-xs text-slate-500">
                    Please close this modal and add your first subject using the &quot;+ Add Subject&quot; button.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 2: Enter Upcoming Exam Date</h3>
                  <p className="text-xs text-slate-500">The engine calculates days remaining and adapts study pacing.</p>
                </div>
              </div>
              <div className="pt-2 space-y-2">
                <label className="text-xs font-semibold text-slate-600">Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 3: Daily Available Study Hours</h3>
                  <p className="text-xs text-slate-500">How many focused hours can you dedicate each day?</p>
                </div>
              </div>
              <div className="pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Daily Study Time:</span>
                  <span className="text-lg font-extrabold text-indigo-600 font-mono">{studyHours} hours / day</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={0.5}
                  value={studyHours}
                  onChange={(e) => setStudyHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 4: Target Score &amp; Baseline</h3>
                  <p className="text-xs text-slate-500">Set your aspiration and past performance for accurate calibration.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Target Marks (%)</label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={targetMarks}
                    onChange={(e) => setTargetMarks(parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Previous Exam Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={prevMarks}
                    onChange={(e) => setPrevMarks(parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Step 5: Identify Weak Areas</h3>
                  <p className="text-xs text-slate-500">Select topics you find challenging for prioritized scheduling.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 max-h-48 overflow-y-auto">
                {availableTopics.map((topic) => {
                  const isSelected = weakTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleToggleTopic(topic)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate pr-2">{topic}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Configuration Complete!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Ready to compile an evidence-backed study plan for <strong>{currentSubjectObj?.name || 'Selected Subject'}</strong>.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-800">{currentSubjectObj?.name || 'Active Subject'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exam Date:</span>
                  <span className="font-bold text-slate-800">{examDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Marks:</span>
                  <span className="font-bold text-indigo-600">{targetMarks}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Weak Topics Selected:</span>
                  <span className="font-bold text-amber-600">{weakTopics.length} topics</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinalGenerate}
              disabled={loading || !selectedSubjectId}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? <span>Generating Plan...</span> : <span>Generate Study Schedule</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
