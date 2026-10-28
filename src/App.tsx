/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  Search,
  Shield,
  Sparkles,
  Users,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  BarChart3,
  UserCheck,
  Award,
  RefreshCw,
  FilePlus,
  Send
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff";
  department: string;
  managerId?: string;
}

interface SopDocument {
  id: string;
  title: string;
  department: string;
  version: string;
  content: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizAssignment {
  id: string;
  sopId: string;
  sopTitle: string;
  staffId: string;
  staffName: string;
  managerId: string;
  numQuestions: number;
  questions: QuizQuestion[];
  status: "pending" | "completed";
  assignedAt: string;
  dueDate: string;
}

interface QuizAttempt {
  id: string;
  assignmentId: string;
  sopId: string;
  sopTitle: string;
  staffId: string;
  staffName: string;
  department: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  completedAt: string;
  userAnswers: number[];
  questions: QuizQuestion[];
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [sops, setSops] = useState<SopDocument[]>([]);
  const [assignments, setAssignments] = useState<QuizAssignment[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Loading & state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Forms
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSopForView, setSelectedSopForView] = useState<SopDocument | null>(null);
  const [activeQuizAssignment, setActiveQuizAssignment] = useState<QuizAssignment | null>(null);
  const [selectedAttemptForReview, setSelectedAttemptForReview] = useState<QuizAttempt | null>(null);

  // Form inputs
  const [newSopTitle, setNewSopTitle] = useState("");
  const [newSopDept, setNewSopDept] = useState("Operations");
  const [newSopVersion, setNewSopVersion] = useState("v1.0");
  const [newSopContent, setNewSopContent] = useState("");
  const [isUploadingSop, setIsUploadingSop] = useState(false);

  // Assign Form inputs
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assignSopId, setAssignSopId] = useState("");
  const [assignNumQuestions, setAssignNumQuestions] = useState(3);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Quiz Taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lastAttemptResult, setLastAttemptResult] = useState<QuizAttempt | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, sRes, aRes, attRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/sops"),
        fetch("/api/assignments"),
        fetch("/api/attempts"),
      ]);

      const uData = await uRes.json();
      const sData = await sRes.json();
      const aData = await aRes.json();
      const attData = await attRes.json();

      setUsers(uData);
      setSops(sData);
      setAssignments(aData);
      setAttempts(attData);

      if (uData.length > 0 && !currentUser) {
        setCurrentUser(uData[0]); // Default to Admin (Sarah Jenkins)
      }
    } catch (err: any) {
      setError("Failed to load LMS data from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSopTitle || !newSopContent || !currentUser) return;

    try {
      setIsUploadingSop(true);
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSopTitle,
          department: newSopDept,
          version: newSopVersion,
          content: newSopContent,
          uploadedBy: currentUser.name,
        }),
      });

      if (!res.ok) throw new Error("Failed to upload SOP");
      const created = await res.json();
      setSops([...sops, created]);
      setShowUploadModal(false);
      setNewSopTitle("");
      setNewSopContent("");
      setNewSopVersion("v1.0");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploadingSop(false);
    }
  };

  const handleGenerateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffId || !assignSopId || !currentUser) return;

    const staffMember = users.find(u => u.id === assignStaffId);
    if (!staffMember) return;

    try {
      setIsGeneratingQuiz(true);
      // 1. Generate quiz questions via Gemini AI API
      const genRes = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopId: assignSopId,
          numQuestions: assignNumQuestions,
        }),
      });

      if (!genRes.ok) throw new Error("Failed to generate AI quiz questions");
      const genData = await genRes.json();

      // 2. Create assignment
      const asgRes = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopId: assignSopId,
          staffId: assignStaffId,
          managerId: currentUser.id,
          numQuestions: assignNumQuestions,
          questions: genData.questions,
        }),
      });

      if (!asgRes.ok) throw new Error("Failed to save assignment");
      const newAsg = await asgRes.json();
      setAssignments([...assignments, newAsg]);
      setShowAssignModal(false);
      setAssignStaffId("");
      setAssignSopId("");
      alert(`Successfully generated ${genData.questions.length} AI quiz questions and assigned to ${staffMember.name}!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const startQuiz = (assignment: QuizAssignment) => {
    setActiveQuizAssignment(assignment);
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(assignment.questions.length).fill(-1));
    setQuizSubmitted(false);
    setLastAttemptResult(null);
  };

  const handleSelectOption = (optionIdx: number) => {
    const updated = [...userAnswers];
    updated[currentQuestionIndex] = optionIdx;
    setUserAnswers(updated);
  };

  const submitQuizAttempt = async () => {
    if (!activeQuizAssignment) return;
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: activeQuizAssignment.id,
          userAnswers,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit quiz attempt");
      const attemptResult = await res.json();
      setLastAttemptResult(attemptResult);
      setQuizSubmitted(true);
      setAttempts([...attempts, attemptResult]);
      // Update local assignments list status
      setAssignments(assignments.map(a => a.id === activeQuizAssignment.id ? { ...a, status: "completed" } : a));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
          <span className="text-sm font-medium tracking-wide">Loading CertiFlow LMS...</span>
        </div>
      </div>
    );
  }

  // Filtered lists
  const staffUsers = users.filter(u => u.role === "staff");
  const myAssignments = currentUser ? assignments.filter(a => a.staffId === currentUser.id && a.status === "pending") : [];
  const myAttempts = currentUser ? attempts.filter(att => att.staffId === currentUser.id) : [];
  const teamAssignments = currentUser && currentUser.role === "manager" ? assignments.filter(a => a.managerId === currentUser.id) : assignments;
  const teamAttempts = currentUser && currentUser.role === "manager" 
    ? attempts.filter(att => {
        const staff = users.find(u => u.id === att.staffId);
        return staff?.managerId === currentUser.id || staff?.department === currentUser.department;
      }) 
    : attempts;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Bar Contract (3 Zones) */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">CertiFlow</span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">SOP & Job LMS</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${activeTab === "dashboard" ? "text-white border-sky-500 font-semibold" : "border-transparent hover:text-white"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("sops")}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${activeTab === "sops" ? "text-white border-sky-500 font-semibold" : "border-transparent hover:text-white"}`}
          >
            SOP Library
          </button>
          {currentUser?.role !== "staff" && (
            <button
              onClick={() => setActiveTab("assign")}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${activeTab === "assign" ? "text-white border-sky-500 font-semibold" : "border-transparent hover:text-white"}`}
            >
              Quiz Assignments
            </button>
          )}
          <button
            onClick={() => setActiveTab("gradebook")}
            className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${activeTab === "gradebook" ? "text-white border-sky-500 font-semibold" : "border-transparent hover:text-white"}`}
          >
            {currentUser?.role === "staff" ? "My Performance" : "Gradebook & Compliance"}
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveTab("users")}
              className={`transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${activeTab === "users" ? "text-white border-sky-500 font-semibold" : "border-transparent hover:text-white"}`}
            >
              User RBAC
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action & Role Switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-medium text-slate-300">Role:</span>
            <select
              value={currentUser?.id}
              onChange={(e) => {
                const found = users.find(u => u.id === e.target.value);
                if (found) setCurrentUser(found);
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {users.map(u => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                  {u.name} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {currentUser?.role !== "staff" && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/25 whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assign AI Quiz
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
        {/* Active Quiz Taking Screen */}
        {activeQuizAssignment && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-sky-400 uppercase tracking-widest block mb-1">Assessment In Progress</span>
                  <h2 className="text-xl font-bold text-white">{activeQuizAssignment.sopTitle}</h2>
                </div>
                <button
                  onClick={() => setActiveQuizAssignment(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!quizSubmitted ? (
                <div className="space-y-6">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Question {currentQuestionIndex + 1} of {activeQuizAssignment.questions.length}</span>
                      <span>{Math.round(((currentQuestionIndex + 1) / activeQuizAssignment.questions.length) * 100)}% Complete</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / activeQuizAssignment.questions.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Question box */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
                    <h3 className="text-base font-semibold text-white">
                      {activeQuizAssignment.questions[currentQuestionIndex].question}
                    </h3>
                    <div className="space-y-2 pt-2">
                      {activeQuizAssignment.questions[currentQuestionIndex].options.map((option, oIdx) => {
                        const isSelected = userAnswers[currentQuestionIndex] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectOption(oIdx)}
                            className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${
                              isSelected
                                ? "bg-sky-500/10 border-sky-500 text-white font-medium shadow-sm"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850"
                            }`}
                          >
                            <span>{option}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? "border-sky-500 bg-sky-500" : "border-slate-600"}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      disabled={currentQuestionIndex === 0}
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    {currentQuestionIndex < activeQuizAssignment.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-md shadow-sky-600/20"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        disabled={userAnswers.includes(-1)}
                        onClick={submitQuizAttempt}
                        className="px-6 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Submit Assessment
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Quiz Result view */
                <div className="space-y-6 text-center py-4">
                  {lastAttemptResult && (
                    <>
                      <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-lg ${lastAttemptResult.passed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}>
                        {lastAttemptResult.passed ? <Award className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-white">
                          {lastAttemptResult.passed ? "Assessment Passed!" : "Assessment Failed"}
                        </h3>
                        <p className="text-sm text-slate-400">
                          Score: <strong className="text-white font-mono">{lastAttemptResult.score}%</strong> ({lastAttemptResult.correctCount} of {lastAttemptResult.totalQuestions} correct)
                        </p>
                        <p className="text-xs text-slate-500">
                          Passing requirement: 80% or higher.
                        </p>
                      </div>

                      <div className="pt-4 flex justify-center">
                        <button
                          onClick={() => setActiveQuizAssignment(null)}
                          className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                        >
                          Return to Dashboard
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload SOP Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg font-bold text-white">Upload Job Function / SOP Document</h2>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSop} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Document Title & Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOP-088: Emergency Vent Calibration"
                    value={newSopTitle}
                    onChange={(e) => setNewSopTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                    <select
                      value={newSopDept}
                      onChange={(e) => setNewSopDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Operations">Operations</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                      <option value="Safety & Compliance">Safety & Compliance</option>
                      <option value="Engineering">Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Version</label>
                    <input
                      type="text"
                      value={newSopVersion}
                      onChange={(e) => setNewSopVersion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SOP Source Text / Instructions</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Paste SOP body text, purpose, steps, and safety guidelines here..."
                    value={newSopContent}
                    onChange={(e) => setNewSopContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono text-xs"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingSop}
                    className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50"
                  >
                    {isUploadingSop && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Upload & Index SOP
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign AI Quiz Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg font-bold text-white">AI Quiz Generator & Assignment</h2>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateAndAssign} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">1. Select Staff Member</label>
                  <select
                    required
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Choose staff member --</option>
                    {staffUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">2. Select Job Function / SOP Document</label>
                  <select
                    required
                    value={assignSopId}
                    onChange={(e) => setAssignSopId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Choose SOP document --</option>
                    {sops.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">3. Number of Assessment Questions ($N$)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={3}
                      max={8}
                      value={assignNumQuestions}
                      onChange={(e) => setAssignNumQuestions(Number(e.target.value))}
                      className="flex-1 accent-sky-500"
                    />
                    <span className="text-base font-bold font-mono text-sky-400 w-8 text-center">{assignNumQuestions}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Gemini AI will dynamically generate {assignNumQuestions} targeted questions based on the selected SOP.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingQuiz}
                    className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-sky-600/20 disabled:opacity-50"
                  >
                    {isGeneratingQuiz ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate & Assign Quiz
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SOP View Modal */}
        {selectedSopForView && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                <div>
                  <span className="text-xs font-mono text-sky-400 uppercase tracking-widest">{selectedSopForView.department} · {selectedSopForView.version}</span>
                  <h2 className="text-lg font-bold text-white">{selectedSopForView.title}</h2>
                </div>
                <button onClick={() => setSelectedSopForView(null)} className="text-slate-400 hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed">
                {selectedSopForView.content}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-500">Uploaded by {selectedSopForView.uploadedBy} on {new Date(selectedSopForView.uploadedAt).toLocaleDateString()}</span>
                <button
                  onClick={() => setSelectedSopForView(null)}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Hero Welcome Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-8 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/20">
                    {currentUser?.role.toUpperCase()} Workspace
                  </span>
                  <span className="text-xs text-slate-400">· {currentUser?.department} Department</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Welcome back, {currentUser?.name}
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {currentUser?.role === "staff" 
                    ? "Complete your assigned SOP compliance assessments and maintain clean standing records."
                    : currentUser?.role === "manager"
                    ? "Manage your team's standard operating procedures, deploy AI-generated quizzes, and monitor departmental compliance."
                    : "Organization-wide system administration, RBAC governance, and audit gradebook analytics."}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {currentUser?.role === "staff" ? (
                  <button
                    onClick={() => {
                      if (myAssignments.length > 0) startQuiz(myAssignments[0]);
                      else alert("No pending assigned quizzes at the moment.");
                    }}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-lg shadow-sky-600/25 flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Take Next Pending Quiz ({myAssignments.length})
                  </button>
                ) : (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-lg shadow-sky-600/25 flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Upload New SOP
                  </button>
                )}
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Active SOPs</span>
                  <FileText className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">{sops.length}</div>
                <div className="text-[11px] text-slate-500">Indexed job functions & guidelines</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Pending Assignments</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {currentUser?.role === "staff" ? myAssignments.length : assignments.filter(a => a.status === "pending").length}
                </div>
                <div className="text-[11px] text-slate-500">Awaiting staff completion</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Completed Attempts</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {currentUser?.role === "staff" ? myAttempts.length : attempts.length}
                </div>
                <div className="text-[11px] text-slate-500">Total recorded quiz submissions</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Pass Rate</span>
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {attempts.length > 0 ? Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100) : 100}%
                </div>
                <div className="text-[11px] text-slate-500">Passing score threshold (&gt;=80%)</div>
              </div>
            </div>

            {/* Staff View: Pending Quizzes */}
            {currentUser?.role === "staff" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Assigned Quizzes ({myAssignments.length})</h2>
                {myAssignments.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">All caught up!</p>
                    <p className="text-xs text-slate-500 mt-1">You have no pending SOP quizzes assigned at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myAssignments.map(asg => (
                      <div key={asg.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-xs text-sky-400 font-mono">Assigned by Manager</span>
                          <h3 className="text-base font-semibold text-white">{asg.sopTitle}</h3>
                          <p className="text-xs text-slate-400">{asg.numQuestions} AI-generated assessment questions</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                          <span className="text-[11px] text-slate-500">Due: {new Date(asg.dueDate).toLocaleDateString()}</span>
                          <button
                            onClick={() => startQuiz(asg)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-sky-600/20"
                          >
                            Start Assessment
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manager / Admin View: Recent Team Activity & Quick Overview */}
            {currentUser?.role !== "staff" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Recent Team Compliance Activity</h2>
                  <button onClick={() => setActiveTab("gradebook")} className="text-xs text-sky-400 hover:underline">
                    View Full Gradebook
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/50">
                        <th className="p-4">Staff Member</th>
                        <th className="p-4">Job Function SOP</th>
                        <th className="p-4">Score</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {attempts.slice(-5).reverse().map(att => (
                        <tr key={att.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4 font-medium text-white">{att.staffName}</td>
                          <td className="p-4 text-slate-300 max-w-xs truncate">{att.sopTitle}</td>
                          <td className="p-4 font-mono tabular-nums text-white">{att.score}%</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${att.passed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                              {att.passed ? "Passed" : "Failed"}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-mono">{new Date(att.completedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: SOP Library */}
        {activeTab === "sops" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Job Function & SOP Library</h1>
                <p className="text-sm text-slate-400">Standard Operating Procedures, safety instructions, and technical guidelines.</p>
              </div>

              {currentUser?.role !== "staff" && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-sky-600/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  Upload SOP Document
                </button>
              )}
            </div>

            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search SOP title or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="All">All Departments</option>
                <option value="Operations">Operations</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Safety & Compliance">Safety & Compliance</option>
                <option value="Engineering">Engineering</option>
              </select>
            </div>

            {/* SOP Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sops
                .filter(s => departmentFilter === "All" || s.department === departmentFilter)
                .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.content.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(sop => (
                  <div key={sop.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                    <div className="space-y-3">
                      {/* Unboxed Metadata (Zero-Pill Rule) */}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{sop.department}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sop.version}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(sop.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      <h3 className="text-base font-semibold text-white leading-snug">{sop.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-3 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {sop.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <span className="text-[11px] text-slate-500">By {sop.uploadedBy}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedSopForView(sop)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Read SOP
                        </button>
                        {currentUser?.role !== "staff" && (
                          <button
                            onClick={() => {
                              setAssignSopId(sop.id);
                              setShowAssignModal(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            Assign Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab Content: Assign & Quiz Management */}
        {activeTab === "assign" && currentUser?.role !== "staff" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Quiz Assignments & AI Generation</h1>
                <p className="text-sm text-slate-400">Deploy AI-generated quizzes to staff members based on SOP documents.</p>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-sky-600/20"
              >
                <Sparkles className="w-4 h-4" />
                New AI Quiz Assignment
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/50">
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">SOP Document</th>
                    <th className="p-4">Questions ($N$)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned Date</th>
                    <th className="p-4 text-right">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {assignments.map(asg => (
                    <tr key={asg.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-4 font-semibold text-white">{asg.staffName}</td>
                      <td className="p-4 text-slate-300 max-w-sm truncate">{asg.sopTitle}</td>
                      <td className="p-4 font-mono tabular-nums text-white">{asg.numQuestions}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${asg.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                          {asg.status === "completed" ? "Completed" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{new Date(asg.assignedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right text-slate-400 font-mono">{new Date(asg.dueDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Gradebook & Compliance */}
        {activeTab === "gradebook" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {currentUser?.role === "staff" ? "My Assessment Performance History" : "Centralized Gradebook & Compliance"}
                </h1>
                <p className="text-sm text-slate-400">
                  {currentUser?.role === "staff" ? "Review past scores and detailed answer breakdowns." : "Organization-wide staff scores, pass/fail audit trails, and compliance metrics."}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/50">
                    {currentUser?.role !== "staff" && <th className="p-4">Staff Member</th>}
                    {currentUser?.role !== "staff" && <th className="p-4">Department</th>}
                    <th className="p-4">Job Function SOP</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {(currentUser?.role === "staff" ? myAttempts : teamAttempts).map(att => (
                    <tr key={att.id} className="hover:bg-slate-850/50 transition-colors">
                      {currentUser?.role !== "staff" && <td className="p-4 font-semibold text-white">{att.staffName}</td>}
                      {currentUser?.role !== "staff" && <td className="p-4 text-slate-400">{att.department}</td>}
                      <td className="p-4 text-slate-300 max-w-xs truncate">{att.sopTitle}</td>
                      <td className="p-4 font-mono tabular-nums font-bold text-white">{att.score}% ({att.correctCount}/{att.totalQuestions})</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${att.passed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                          {att.passed ? "Passed" : "Failed"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{new Date(att.completedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: User RBAC (Admin only) */}
        {activeTab === "users" && currentUser?.role === "admin" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">User Management & RBAC</h1>
              <p className="text-sm text-slate-400">Organization personnel hierarchy across Admin, Manager, and Staff roles.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/50">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Department</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-4 font-semibold text-white">{u.name}</td>
                      <td className="p-4 text-slate-400 font-mono">{u.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase ${u.role === "admin" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : u.role === "manager" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" : "bg-slate-800 text-slate-300"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-300">{u.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
