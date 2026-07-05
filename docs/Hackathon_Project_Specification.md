# Hackathon Registration & Evaluation Platform - Detailed Specification

## 1. Project Overview
The Hackathon Registration and Evaluation Platform is a comprehensive system designed to manage the end-to-end lifecycle of a hackathon event. It facilitates team registration, evaluator assignment, scoring, and the final publication of results. The platform supports up to 2,000 teams and 50 evaluators, ensuring a scalable and structured evaluation process.

## 2. User Roles
The platform caters to three primary user roles:
1.  **Participant (Team):** Registers for the hackathon, selects a problem statement, and uploads their presentation (converted to PDF).
2.  **Evaluator (Admin):** Reviews and scores the teams assigned to them based on a standardized 100-mark rubric.
3.  **Super Admin:** Manages the entire event, including overseeing evaluators, problem statements (PS), assigning teams, monitoring the evaluation progress, and finalizing/publishing results.

## 3. Team Registration Module
### 3.1 Registration Process
*   **Landing Page:** Contains general event information and a downloadable PPT template for teams to use.
*   **Form Submission:** Teams submit their details. Constraints include:
    *   Maximum 2,000 teams.
    *   Team size of up to 6 members, with a mandatory requirement of at least **1 female member**.
    *   Email addresses must belong to the `@cuchd.in` domain.
    *   Members 2-6 must provide UID, Department, and Cluster details.
    *   Problem Statement selected from a searchable dropdown.
*   **File Upload:** The PPT must be converted to **PDF format** before uploading. Max file sizes are enforced server-side.
*   **Post-Registration:** Upon success, the PDF is uploaded to Google Drive/S3, and the data is saved to the database.

### 3.2 Automated Emails (NodeMailer)
A confirmation email is sent to the team leader containing a success message, a summary of form data, the assigned Problem Statement/Category, and a unique Team Registration ID.

## 4. Evaluator (Admin) Module
### 4.1 Onboarding & Authentication
*   Evaluators register with their email and name.
*   An OTP (valid for 10 minutes) is sent via NodeMailer.
*   Upon OTP verification, a system-generated password is sent to the evaluator.
*   Evaluators log in using their email and the generated password (password reset functionality is available via a new OTP flow).

### 4.2 Dashboard & Scoring
*   Evaluators only see teams explicitly assigned to them by the Super Admin.
*   They can open a "Team Detail" view, which features an inline PDF viewer (preventing direct downloads).
*   **Scoring Rubric:** Evaluators score teams across 5 sections, each worth 20 marks (Total = 100 marks).
    *   Sections: Problem, Innovation, Tech, Presentation, Impact.
*   **Submission:** Once all 5 sections are scored and submitted, the score is locked in the database and becomes immutable for the evaluator.

## 5. Super Admin Module
### 5.1 Authentication
*   Secure login via a separate route (e.g., `/superadmin/dashboard`).
*   Password authentication hashed with bcrypt.
*   Session-based auth with a strict 1-hour inactivity timeout and brute-force protection.

### 5.2 Control Sections
*   **Evaluators List:** Manage (activate/deactivate) up to 50 evaluators.
*   **PS / Category List:** Manage problem statements and tags (HW/SW, Ministry).
*   **All Teams List:** View all 2,000 teams, filterable by various metrics.
*   **Assign Teams:** Assign teams to evaluators manually, by PS, or by Category. Evaluator workload is visually indicated.
*   **Export:** Export all data (Teams, Scores, Drive Links) to Excel (`.xlsx`).

## 6. Results & Release Module
### 6.1 Score Aggregation & Review
*   Scores are aggregated automatically in the central database as soon as evaluators submit them.
*   The Super Admin Dashboard features a **Pending Evaluations Tracker** to chase evaluators who haven't finished scoring.
*   Super Admins can validate scores, spot-check outliers, and unlock scores for re-evaluation if necessary (requiring a recorded reason for audit trails).

### 6.2 Finalization & Publication Options
*   **Finalize Rankings:** Sorts all teams by Total Score descending (configurable tie-breakers exist).
*   **Publish Results:** Once published, the following actions can occur:
    *   **Public Result Page:** A `/results` page displays the ranked leaderboard (Rank, Team Name, PS, Category, Total Score, Status). It hides the per-section breakdown and evaluator names.
    *   **Email Blast:** NodeMailer sends personalized emails to team leaders with their rank, total score, and a link to the results page.
    *   **Excel Export:** Full detailed export for the organizing committee.
    *   **Winner Announcement:** Highlights top teams on the public leaderboard.

## 7. Business Rules & Constraints
*   **Limits:** 2,000 teams max, 50 evaluators max.
*   **Validation:** Domain restriction `@cuchd.in`, 1 female member minimum, PDF only for uploads.
*   **Security:** Passwords hashed with bcrypt, 1-hour SA inactivity timeout, HTTPS enforced, Rate-limiting on login.
*   **Data Integrity:** Scores are locked post-submission by evaluators. Only Super Admin can override or unlock them. Evaluators only see assigned teams.

## 8. Tech Stack & Infrastructure
*   **Frontend:** React.js / Next.js (utilizing `react-select` and `react-pdf`).
*   **Backend:** Node.js + Express (utilizing `bcrypt`, `express-session`).
*   **Database:** PostgreSQL or MongoDB.
*   **Email Service:** NodeMailer via SMTP.
*   **File Storage:** Google Drive / AWS S3.
*   **Export Tools:** `exceljs` / `xlsx`.

## 9. System Flow Highlights
*   **Registration Flow:** Landing -> Form Fill -> Validation -> Save DB + Upload PDF -> NodeMailer Confirm -> Success Page.
*   **Evaluator Flow:** OTP Request -> OTP Verify -> Password Received -> Login -> Dashboard -> View Team -> Score 5 Sections -> Submit (Lock).
*   **Result Release Flow:** DB Aggregation -> SA Review & Spot-Check -> Finalize Ranking -> Publish -> Fan out to Public Page, Emails, and Excel.
