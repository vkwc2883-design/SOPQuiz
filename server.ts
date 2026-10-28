import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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
  correctAnswer: number; // index 0-3
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
  score: number; // percentage 0-100
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  completedAt: string;
  userAnswers: number[];
  questions: QuizQuestion[];
}

// In-memory seed data
let users: User[] = [
  { id: "u1", name: "Sarah Jenkins", email: "sarah.jenkins@certiflow.io", role: "admin", department: "Executive" },
  { id: "u2", name: "David Thorne", email: "david.thorne@certiflow.io", role: "manager", department: "Operations" },
  { id: "u3", name: "Elena Rostova", email: "elena.rostova@certiflow.io", role: "manager", department: "Quality Assurance" },
  { id: "u4", name: "Alex Mercer", email: "alex.mercer@certiflow.io", role: "staff", department: "Operations", managerId: "u2" },
  { id: "u5", name: "Jessica Wu", email: "jessica.wu@certiflow.io", role: "staff", department: "Operations", managerId: "u2" },
  { id: "u6", name: "Marcus Brody", email: "marcus.brody@certiflow.io", role: "staff", department: "Quality Assurance", managerId: "u3" },
];

let sops: SopDocument[] = [
  {
    id: "sop-1",
    title: "SOP-042: High-Pressure Steam Boiler Emergency Shutdown & LOTO",
    department: "Operations",
    version: "v2.4",
    uploadedBy: "David Thorne",
    uploadedAt: "2026-10-15T09:30:00Z",
    content: `STANDARD OPERATING PROCEDURE: SOP-042
Title: High-Pressure Steam Boiler Emergency Shutdown & Lockout/Tagout (LOTO)
1. Purpose: This procedure defines the mandatory steps for executing an immediate emergency shutdown of industrial high-pressure steam boilers and executing LOTO protocols in accordance with OSHA standard 1910.147.
2. Scope: Applicable to all Operations and Maintenance personnel at Plant Alpha.
3. Procedure Steps:
   - Step A: Identify emergency trigger (pressure exceeding 450 PSI, water level critical low, or rupture detected).
   - Step B: Activate the Master Emergency Fuel Shut-Off Valve (ESD-1) located in Control Room B.
   - Step C: Initiate electrical Lockout/Tagout (LOTO) on Main Breaker MCC-4 using a red padlock and dated tag.
   - Step D: Vent residual steam pressure slowly via Vent Valve VV-12 while wearing heavy thermal gauntlets and face shields.
   - Step E: Verify zero energy state on Pressure Gauge PG-8 for at least 15 consecutive minutes before maintenance entry.`
  },
  {
    id: "sop-2",
    title: "SOP-108: Cleanroom Sterile Garbing & Contamination Control",
    department: "Quality Assurance",
    version: "v3.1",
    uploadedBy: "Elena Rostova",
    uploadedAt: "2026-10-18T14:15:00Z",
    content: `STANDARD OPERATING PROCEDURE: SOP-108
Title: ISO Class 5 Cleanroom Sterile Garbing and Contamination Control
1. Purpose: To prevent particulate and microbial contamination in semiconductor and pharmaceutical manufacturing cleanrooms.
2. Order of Donning:
   - 1. Dedicated shoe covers / booties (must not touch clean side before shoe cover).
   - 2. Hair net and beard cover (ensure zero hair strands exposed).
   - 3. Face mask secured tightly over bridge of nose.
   - 4. Tyvek hooded coverall (garment must never touch the floor).
   - 5. Sterile nitrile gloves (double gloving required; sanitize with 70% IPA between layers).
3. Prohibited Items: Cosmetics, jewelry, watches, smartwatches, and pencils are strictly banned inside ISO Class 5 areas.`
  },
  {
    id: "sop-3",
    title: "SOP-019: Forklift Safe Operation & Material Handling Protocol",
    department: "Operations",
    version: "v1.9",
    uploadedBy: "David Thorne",
    uploadedAt: "2026-10-20T11:00:00Z",
    content: `STANDARD OPERATING PROCEDURE: SOP-019
Title: Warehouse Forklift Safe Operation & Heavy Material Handling
1. Pre-Operation Check: Operators must inspect fluid levels, tire pressure, horn, strobe light, and hydraulic lift cylinders prior to every shift. Log inspection in Form WH-9.
2. Speed Limits & Right-of-Way:
   - Maximum indoor warehouse speed is 5 MPH (8 KM/H).
   - Pedestrians always have the absolute right-of-way. Sound horn at all blind intersections and rack corners.
3. Load Stability:
   - Keep forks tilted back when transporting loads.
   - Travel with loads elevated no more than 4 to 6 inches (10-15 cm) off the floor.
   - Never elevate a load on an incline or grade exceeding 10 degrees.`
  }
];

let assignments: QuizAssignment[] = [
  {
    id: "asg-1",
    sopId: "sop-1",
    sopTitle: "SOP-042: High-Pressure Steam Boiler Emergency Shutdown & LOTO",
    staffId: "u4",
    staffName: "Alex Mercer",
    managerId: "u2",
    numQuestions: 3,
    status: "pending",
    assignedAt: "2026-10-25T10:00:00Z",
    dueDate: "2026-11-01T23:59:59Z",
    questions: [
      {
        id: "q-1",
        question: "What is the pressure threshold that triggers an emergency shutdown according to SOP-042?",
        options: ["Exceeding 250 PSI", "Exceeding 450 PSI", "Exceeding 600 PSI", "Exceeding 1000 PSI"],
        correctAnswer: 1,
        explanation: "SOP-042 specifies that pressure exceeding 450 PSI is an emergency trigger."
      },
      {
        id: "q-2",
        question: "Where is the Master Emergency Fuel Shut-Off Valve (ESD-1) located?",
        options: ["Boiler Room A", "Control Room B", "Exterior Loading Dock", "Maintenance Workshop"],
        correctAnswer: 1,
        explanation: "Step B states ESD-1 is located in Control Room B."
      },
      {
        id: "q-3",
        question: "How long must zero energy state be verified on Pressure Gauge PG-8 before maintenance entry?",
        options: ["At least 5 minutes", "At least 10 minutes", "At least 15 consecutive minutes", "30 minutes"],
        correctAnswer: 2,
        explanation: "Step E requires verifying zero energy state for at least 15 consecutive minutes."
      }
    ]
  }
];

let attempts: QuizAttempt[] = [
  {
    id: "att-1",
    assignmentId: "asg-old-1",
    sopId: "sop-2",
    sopTitle: "SOP-108: Cleanroom Sterile Garbing & Contamination Control",
    staffId: "u6",
    staffName: "Marcus Brody",
    department: "Quality Assurance",
    score: 100,
    correctCount: 3,
    totalQuestions: 3,
    passed: true,
    completedAt: "2026-10-24T15:20:00Z",
    userAnswers: [0, 1, 2],
    questions: [
      {
        id: "q-g1",
        question: "What is the first item in the order of donning for cleanrooms?",
        options: ["Dedicated shoe covers / booties", "Hair net", "Face mask", "Tyvek coverall"],
        correctAnswer: 0,
        explanation: "Shoe covers must be donned first without touching the clean side."
      },
      {
        id: "q-g2",
        question: "Which of the following items is strictly banned inside ISO Class 5 areas?",
        options: ["Safety glasses", "Smartwatches", "Hair nets", "Nitrile gloves"],
        correctAnswer: 1,
        explanation: "Smartwatches, jewelry, and cosmetics are strictly banned."
      },
      {
        id: "q-g3",
        question: "What sanitization agent is used between double gloving layers?",
        options: ["Bleach 10%", "Hydrogen peroxide", "70% Isopropyl Alcohol (IPA)", "Soap and water"],
        correctAnswer: 2,
        explanation: "Sanitize with 70% IPA between layers."
      }
    ]
  }
];

export function createServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/users", (req, res) => {
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || "staff",
      department: req.body.department || "Operations",
      managerId: req.body.managerId,
    };
    users.push(newUser);
    res.status(201).json(newUser);
  });

  app.get("/api/sops", (req, res) => {
    res.json(sops);
  });

  app.post("/api/sops", (req, res) => {
    const newSop: SopDocument = {
      id: `sop-${Date.now()}`,
      title: req.body.title,
      department: req.body.department,
      version: req.body.version || "v1.0",
      content: req.body.content,
      uploadedBy: req.body.uploadedBy || "Manager",
      uploadedAt: new Date().toISOString(),
    };
    sops.push(newSop);
    res.status(201).json(newSop);
  });

  app.get("/api/assignments", (req, res) => {
    res.json(assignments);
  });

  // AI Quiz Generation Endpoint using @google/genai SDK
  app.post("/api/ai/generate-quiz", async (req, res) => {
    try {
      const { sopId, numQuestions = 4 } = req.body;
      const sop = sops.find((s) => s.id === sopId);
      if (!sop) {
        return res.status(404).json({ error: "SOP document not found" });
      }

      if (!process.env.GEMINI_API_KEY) {
        // Fallback mock questions if API key is not present
        const fallbackQuestions: QuizQuestion[] = Array.from({ length: numQuestions }, (_, i) => ({
          id: `q-gen-${i + 1}`,
          question: `Based on ${sop.title}, what is key compliance check #${i + 1}?`,
          options: [
            "Follow standard protocol and verify safety checklist",
            "Bypass inspection if time is constrained",
            "Ignore safety thresholds",
            "Proceed without supervisory sign-off"
          ],
          correctAnswer: 0,
          explanation: `Standard operating procedure compliance is mandatory for all personnel.`
        }));
        return res.json({ questions: fallbackQuestions });
      }

      const prompt = `You are an expert instructional designer and safety compliance auditor. 
Generate exactly ${numQuestions} multiple-choice quiz questions based on the following Standard Operating Procedure (SOP) text. 
Each question must test critical understanding, safety guidelines, or procedural steps from the text.
Provide 4 options per question with exactly one correct answer index (0, 1, 2, or 3) and a clear explanatory note.

SOP Title: ${sop.title}
Department: ${sop.department}
Content:
${sop.content}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctAnswer: { type: Type.INTEGER, description: "Index of correct option (0 to 3)" },
                    explanation: { type: Type.STRING },
                  },
                  required: ["id", "question", "options", "correctAnswer", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
        },
      });

      const jsonText = response.text;
      if (!jsonText) {
        throw new Error("Empty response from Gemini API");
      }

      const parsed = JSON.parse(jsonText);
      res.json(parsed);
    } catch (err: any) {
      console.error("AI Quiz Generation Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI quiz" });
    }
  });

  app.post("/api/assignments", (req, res) => {
    const { sopId, staffId, managerId, numQuestions, questions } = req.body;
    const sop = sops.find((s) => s.id === sopId);
    const staff = users.find((u) => u.id === staffId);

    const newAssignment: QuizAssignment = {
      id: `asg-${Date.now()}`,
      sopId,
      sopTitle: sop ? sop.title : "Unknown SOP",
      staffId,
      staffName: staff ? staff.name : "Staff Member",
      managerId: managerId || "u2",
      numQuestions: numQuestions || 3,
      questions: questions || [],
      status: "pending",
      assignedAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    };

    assignments.push(newAssignment);
    res.status(201).json(newAssignment);
  });

  app.get("/api/attempts", (req, res) => {
    res.json(attempts);
  });

  app.post("/api/attempts", (req, res) => {
    const { assignmentId, userAnswers } = req.body;
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const staff = users.find((u) => u.id === assignment.staffId);
    const questions = assignment.questions;
    let correctCount = 0;

    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= 80; // 80% passing threshold

    const newAttempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      assignmentId: assignment.id,
      sopId: assignment.sopId,
      sopTitle: assignment.sopTitle,
      staffId: assignment.staffId,
      staffName: assignment.staffName,
      department: staff ? staff.department : "Operations",
      score,
      correctCount,
      totalQuestions: questions.length,
      passed,
      completedAt: new Date().toISOString(),
      userAnswers,
      questions,
    };

    attempts.push(newAttempt);

    // Update assignment status to completed
    assignment.status = "completed";

    res.status(201).json(newAttempt);
  });

  return { app, vite: null };
}

// If run directly or via tsx server.ts
if (process.argv[1] === fileURLToPath(import.meta.url) || process.env.NODE_ENV !== "production") {
  const { app } = createServer();
  const PORT = 3000;

  async function start() {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`CertiFlow LMS Server running on http://localhost:${PORT}`);
    });
  }

  start();
}
