import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { QuestionItem, Subject } from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { SUSSurveyModal } from './components/SUSSurveyModal';
import { AddSubjectModal } from './components/AddSubjectModal';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MySubjectsPage } from './pages/MySubjectsPage';
import { TopicsPage } from './pages/TopicsPage';
import { ExamPatternsPage } from './pages/ExamPatternsPage';
import { StudyPlanPage } from './pages/StudyPlanPage';
import { QuestionBankPage } from './pages/QuestionBankPage';
import { AnswerCoachPage } from './pages/AnswerCoachPage';
import { SemanticSearchPage } from './pages/SemanticSearchPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProgressPage } from './pages/ProgressPage';
import { AboutPage } from './pages/AboutPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SystemInsightsPage } from './pages/SystemInsightsPage';

interface AuthUser {
  access_token: string;
  role: string;
  full_name: string;
  email: string;
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('examiq_user');
    const token = localStorage.getItem('examiq_token');
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedQuestionForCoach, setSelectedQuestionForCoach] = useState<QuestionItem | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  // Dynamic active subject state
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const loadActiveSubject = useCallback(async () => {
    if (!user?.access_token) return;
    try {
      const [subs, prof] = await Promise.all([
        api.getSubjects().catch(() => []),
        api.getProfile().catch(() => null),
      ]);

      if (subs.length > 0) {
        const active = subs.find((s) => s.id === prof?.subject_id) || subs[0];
        setActiveSubject(active);

        // Fetch progress for countdown
        const prog = await api.getSubjectProgress(active.id).catch(() => null);
        setDaysRemaining(prog?.days_remaining ?? null);
      } else {
        setActiveSubject(null);
        setDaysRemaining(null);
      }
    } catch (err) {
      console.error('Error loading active subject in App:', err);
    }
  }, [user]);

  // Sync token and load active subject on mount / auth change
  useEffect(() => {
    if (user?.access_token) {
      api.setToken(user.access_token);
      loadActiveSubject();
    } else {
      setActiveSubject(null);
      setDaysRemaining(null);
    }
  }, [user, loadActiveSubject]);

  const handleLoginSuccess = (userData: AuthUser) => {
    setUser(userData);
    api.setToken(userData.access_token);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    api.clearToken();
    setUser(null);
    setActiveSubject(null);
    setDaysRemaining(null);
    setActiveTab('dashboard');
  };

  const handleSwitchUser = async (targetRole: 'STUDENT' | 'ADMIN') => {
    try {
      if (targetRole === 'ADMIN') {
        const res = await api.login('admin@examiq.edu', 'AdminPass123!');
        setUser(res as AuthUser);
        setActiveTab('admin');
      } else {
        const res = await api.login('demo@examiq.edu', 'DemoStudent123!');
        setUser(res as AuthUser);
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      console.error('Failed to switch user:', err);
    }
  };

  // If not authenticated, show modern LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Render content according to active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            userName={user.full_name}
            userEmail={user.email}
            userRole={user.role}
            onNavigate={setActiveTab}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />
        );
      case 'my-subjects':
        return (
          <MySubjectsPage
            onNavigate={setActiveTab}
            onSubjectSelected={() => {
              loadActiveSubject();
            }}
          />
        );
      case 'topics':
        return (
          <TopicsPage
            onNavigate={setActiveTab}
            activeSubject={activeSubject}
            onSubjectChange={loadActiveSubject}
          />
        );
      case 'patterns':
        return <ExamPatternsPage onNavigate={setActiveTab} />;
      case 'plan':
        return (
          <StudyPlanPage
            onNavigate={setActiveTab}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />
        );
      case 'questions':
        return (
          <QuestionBankPage
            activeSubject={activeSubject}
            onSubjectChange={loadActiveSubject}
            onNavigate={setActiveTab}
            onSelectQuestion={(question) => {
              setSelectedQuestionForCoach(question);
              setActiveTab('coach');
            }}
          />
        );

      case 'coach':
        return (
          <AnswerCoachPage
            initialQuestion={selectedQuestionForCoach}
            activeSubject={activeSubject}
            onSubjectChange={loadActiveSubject}
            onNavigate={setActiveTab}
          />
        );
      case 'search':
        return (
          <SemanticSearchPage
            activeSubject={activeSubject}
            onSubjectChange={loadActiveSubject}
            onNavigate={setActiveTab}
          />
        );
      case 'documents':
        return (
          <DocumentsPage
            activeSubject={activeSubject}
            onSubjectChange={() => {
              loadActiveSubject();
            }}
            onDocumentCountChange={loadActiveSubject}
          />
        );
      case 'progress':
        return (
          <ProgressPage
            activeSubject={activeSubject}
            onSubjectChange={loadActiveSubject}
            onNavigate={setActiveTab}
          />
        );
      case 'about':
        return (
          <AboutPage
            onNavigate={setActiveTab}
            onOpenSurvey={() => setIsSurveyOpen(true)}
          />
        );
      case 'survey':
        return (
          <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">
                System Usability Scale (SUS) Evaluation
              </h2>
              <p className="text-sm text-slate-600 max-w-xl mx-auto">
                As part of our HCI and Educational Technology research, please complete this standardized
                10-statement evaluation. Your feedback is stored anonymously and calculates our live SUS usability score.
              </p>
              <button
                onClick={() => setIsSurveyOpen(true)}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                Launch Usability Survey
              </button>
            </div>
          </div>
        );
      case 'insights':
        return <SystemInsightsPage />;
      case 'admin':
        if (user.role !== 'ADMIN') {
          return (
            <div className="p-8 max-w-xl mx-auto text-center space-y-4">
              <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Student Preparation Platform</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ExamIQ is designed exclusively for students preparing for exams. Administrative inspection tools are restricted to authorized development accounts.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return <AdminDashboardPage />;
      default:
        return (
          <DashboardPage
            userName={user.full_name}
            userEmail={user.email}
            userRole={user.role}
            onNavigate={setActiveTab}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={user.role}
        userName={user.full_name}
        activeSubject={activeSubject}
        onLogout={handleLogout}
        onAddSubject={() => setIsAddSubjectOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar
          currentTab={activeTab}
          userName={user.full_name}
          userRole={user.role}
          activeSubject={activeSubject}
          daysRemaining={daysRemaining}
          onOpenSurvey={() => setIsSurveyOpen(true)}
          onSwitchUser={handleSwitchUser}
          onNavigate={setActiveTab}
        />

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>

      {/* Global Add Subject Modal */}
      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        onSuccess={async (newSub) => {
          await loadActiveSubject();
          setActiveTab('dashboard');
        }}
      />

      {/* Global Modals */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onPlanGenerated={() => {
          setIsOnboardingOpen(false);
          loadActiveSubject();
          setActiveTab('plan');
        }}
      />

      <SUSSurveyModal
        isOpen={isSurveyOpen || activeTab === 'survey'}
        onClose={() => {
          setIsSurveyOpen(false);
          if (activeTab === 'survey') setActiveTab('dashboard');
        }}
        onSuccess={() => {
          setIsSurveyOpen(false);
          if (activeTab === 'survey') setActiveTab('dashboard');
        }}
      />
    </div>
  );
}

export default App;
