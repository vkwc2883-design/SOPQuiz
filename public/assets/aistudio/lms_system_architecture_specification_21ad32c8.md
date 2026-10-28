# AI-Powered SOP & Job Function LMS: System Specification & AI Studio Prompt

## 1. System Overview
This specification outlines the architecture for a Learning Management System (LMS) designed for organizations to ingest Job Functions/SOP documents, automatically generate role-specific quizzes using Generative AI, assign them via managers, take them via staff, and track performance through a centralized Gradebook.

---

## 2. Module Specifications

### 2.1 User Management Module (RBAC)
The system supports three distinct user roles with strict hierarchy and permissions:
*   **Admin**: 
    *   Manage organization settings and all user accounts.
    *   Assign Managers to specific departments/teams.
    *   View system-wide analytics and logs.
*   **Manager**: 
    *   Upload and manage Job Function documents/SOPs for their teams.
    *   Assign quizzes to direct report Staff.
    *   View department-specific gradebooks and staff compliance.
*   **Staff**: 
    *   View assigned quizzes.
    *   Take quizzes and view personal performance history and feedback.

### 2.2 Job Function & Document Upload Module
*   **Functionality**: Allows Managers and Admins to upload source documents (PDF, TXT, DOCX) detailing specific job functions, standard operating procedures (SOPs), or safety guidelines.
*   **Processing**: Extracts text content and tags documents by department, job title, and version.

### 2.3 Quiz Assignment & Generation Module
*   **Manager Assignment Form**: When a manager wants to assign a quiz, they must complete a form with the following fields:
    1.  **Select Staff Member**: Dropdown populated with staff reporting to the manager.
    2.  **Select Job Function / Source Document**: Dropdown of uploaded SOP/job function documents.
    3.  **Number of Questions ($N$)**: Numeric input specifying how many assessment questions the AI should generate.
*   **AI Quiz Generation Engine**: Upon submission, the system sends the source text and question count ($N$) to the LLM API to dynamically generate multiple-choice or short-answer questions with correct answer keys and explanations.

### 2.4 Gradebook Module
*   **Data Structure**: Tracks every quiz attempt per staff member.
*   **Key Metrics**: Staff Name, Job Function Title, Quiz Date, Score ($\frac{\text{Correct}}{\text{Total}} \times 100\%$ ), Pass/Fail Status, and Detailed Answer Breakdown.
*   **View**: Accessible by Managers for their team and Admins organization-wide.

---

## 3. Implementation Instructions for Google AI Studio / LLM Builder

If you are using Google AI Studio (or Gemini API) to build this application code, use the following system prompt and instructions:

### System Prompt for AI Builder:
> "You are an expert full-stack software engineer and system architect. Build a complete, responsive web application for an LMS with a User Management module (Admin, Manager, Staff roles), a Document Upload module for Job Functions/SOPs, an AI Quiz Assignment form (selecting Staff, Job Function source document, and number of questions $N$), and a Staff Gradebook module. 
> 
> Ensure the application handles state cleanly (using local storage or a mock backend database layer if standalone), provides clean UI mockups with Tailwind CSS, and includes simulated AI question generation based on uploaded text snippets."