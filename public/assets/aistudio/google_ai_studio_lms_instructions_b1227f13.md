# Role & Objective

You are an expert full-stack software architect and AI engineer. Your task is to build a fully functional, prototype Learning Management System (LMS) web application (using Python with Streamlit or FastAPI + React, preferably a clean, self-contained Python/Streamlit app for rapid deployment) that allows managers to upload job function source documents, automatically generate AI quizzes, assign them to staff with customizable question counts, and track results in a gradebook.

# Core Modules & Specifications

## 1. User Management Module (RBAC)

Implement a robust role-based user management system supporting three distinct roles:

* **Admin**: Can manage all user accounts, reset credentials, and view system-wide logs.

* **Manager**: Can view their assigned staff, upload job function source documents, configure and assign quizzes, and view team performance dashboards.

* **Staff**: Can view pending quizzes, take interactive quizzes, and inspect their own performance history and scores. *Include a sidebar role switcher or simulation mock login to test all three roles seamlessly.*

## 2. Job Function Source Document Upload Module

* Enable **Managers** and **Admins** to upload source documents (PDF, TXT, or Markdown) containing specific job functions, standard operating procedures (SOPs), or training manuals.

* Extract and store text securely in session state or a lightweight local database, tracking metadata such as document title, department, and upload timestamp.

## 3. Quiz Generation & Assignment Form

When a Manager initiates a quiz assignment, present a structured