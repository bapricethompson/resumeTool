# Resume Radar

## Demo Video

<!-- Placeholder for demo video. Replace the link below with your actual demo video URL. -->

[![Watch the Demo](https://img.youtube.com/vi/VIDEO_ID_HERE/0.jpg)](https://www.youtube.com/watch?v=KjDeEpfhsOk)

---

## Overview

Resume Radar is an agent-based web application that helps job seekers strengthen their resumes, discover roles that match their experience, and plan career paths for the future. Using retrieval-augmented generation, semantic search, and a modern React front end, Resume Radar analyzes a user’s background, identifies gaps or opportunities, and provides personalized, actionable recommendations. The platform empowers users to understand their job fit, improve their qualifications, and make informed decisions about their career growth.

---

## Problem Domain

Traditional job-matching systems rely heavily on keyword-based comparisons, which often overlook meaningful relationships between a candidate’s experience and a job’s true requirements. As a result, job seekers struggle with:

- Identifying gaps in skills and experience
- Understanding how well their resume aligns with specific roles
- Finding relevant opportunities that aren’t captured by simple keyword matching

Resume Radar solves these challenges by:

- Using Retrieval-Augmented Generation (RAG) and vector embeddings to enable semantic, context-aware job matching
- Evaluating both resume quality and alignment with desired job requirements
- Delivering personalized, actionable recommendations to strengthen the resume and improve job fit

---

## Engineering Process

The development of Resume Radar followed a structured engineering process to ensure a robust, scalable, and portfolio-quality solution:

### 1. Database Selection & Setup

- **Data Acquisition:** Sourced a comprehensive dataset of job titles and descriptions, ensuring coverage across the tech industry and roles.
- **Uploading to MongoDB:** Cleaned and formatted the dataset, then uploaded it to a MongoDB instance using scripts for bulk import. This enabled efficient querying and management of job data.

### 2. Vector Embedding Creation

- **Embedding Generation:** Utilized Ollama Embedding to generate vector embeddings for each job title and description in the database. These embeddings capture semantic meaning, enabling advanced matching beyond simple keyword search.
- **Storage:** Stored the embeddings alongside job records in MongoDB, allowing for fast retrieval and similarity calculations during the matching process.

### 3. Agentic Flow Design

- **Flow Mapping:** Designed the agentic workflow using LangGraph, mapping out each node and decision point (resume extraction, quality assessment, job querying, fit analysis).
- **State Management:** Implemented a persistent state object to track user progress and results as data moves through the agent nodes.

### 4. Implementation & Testing

- **Backend Development:** Built the server-side logic for resume parsing, job matching, and agentic orchestration. Integrated MongoDB queries and embedding-based similarity search.
- **Front-End Development:** Developed a modern React UI for resume upload, profile parsing, job matching dashboard, and feedback presentation.
- **Testing:** Conducted various tests to ensure functionality

---

## Agentic System Architecture

The backend is built with LangGraph, implementing a multi-node agentic workflow. Each node in the graph is responsible for a distinct reasoning or tool-calling step, with a persistent state object passed between nodes to track progress and results.

### Node Graph

```mermaid
graph TD
START → extractResumeNode → resumeQualityNode → routingFunction:
    ├─> incompleteResumeNode → END
    ├─> queryJobTitlesNode → assessFitNode → fitRoutingFunction:
        ├─> lowFitNode → END
        ├─> mediumFitNode → END
        └─> highFitNode → END
    └─> queryJobsNode → assessFitNode → fitRoutingFunction:
        ├─> lowFitNode → END
        ├─> mediumFitNode → END
        └─> highFitNode → END

```

#### Technical Highlights

- **LangGraph Agent Nodes:** Modular nodes for resume extraction, quality assessment, job querying, and fit analysis.
- **Semantic Search:** Utilizes vector embeddings and RAG to match resumes with job titles and descriptions.
- **Persistent State:** Tracks user progress, results, and recommendations throughout the workflow.

---

## Front-End UI Components

The front-end is built with React, providing an intuitive and interactive user experience:

- **Resume Upload:** Users can upload their resume in various formats.
- **Profile Parsing:** Extracted data (skills, experience, education) is displayed for review.
- **Job Matching Dashboard:** Visualizes matched jobs and fit scores, with filtering and sorting options.
- **Quality & Fit Feedback:** Users receive clear feedback on resume quality and job fit, including actionable improvement tips.
- **Recommendations:** Personalized advice and job suggestions are presented in a user-friendly format.

---

## API Overview

Resume Radar provides a RESTful API to support resume analysis, job matching, and career recommendations. The backend is built with Express and integrates MongoDB, LangGraph, and Ollama for agentic reasoning and semantic search.

### Key Endpoint

#### `POST /upload-resume`

- **Description:** Upload a resume (PDF) and optionally specify a desired job. The API parses the resume, evaluates its quality, matches it to relevant jobs, and returns personalized recommendations.
- **Request:**
  - `Content-Type: multipart/form-data`
  - Fields:
    - `resume` (file, required): The resume file in PDF format.
    - `desiredJob` (string, optional): The job title or role the user is interested in.
- **Response:** JSON object containing:
  - Extracted resume data (skills, experience, education)
  - Resume quality assessment and improvement suggestions
  - Top matching jobs and fit scores
  - Personalized career advice and recommendations

#### Example Response:

```json
{
  "resumeData": { ... },
  "resumeQuality": { ... },
  "queryResults": [ ... ],
  "assessmentResults": { ... },
  "advice": { ... },
  "summary": "Top similar job listings: ...",
  "suspectedJob": "Software Engineer"
}
```

### Technical Highlights

- **PDF Parsing:** Extracts text from uploaded resumes for analysis.
- **Agentic Workflow:** Orchestrates resume extraction, quality assessment, job matching, and advice generation using LangGraph nodes.
- **Semantic Search:** Uses vector embeddings to match resumes and job descriptions in MongoDB.
- **Extensible:** Additional endpoints and tools can be added for new features.

For more details, see the backend implementation in [`server/server.js`](server/server.js).

---

## Getting Started

1. **Install Dependencies**

   - From the root directory, run:
     ```
     npm install
     cd client && npm install
     cd ../server && npm install
     ```

2. **Run the Application**

   - Start the server:
     ```
     cd server
     npm start
     ```
   - Start the client:
     ```
     cd ../client
     npm start
     ```

3. **Access the UI**
   - Open your browser and navigate to `http://localhost:3000`

---

## Portfolio Features

- **End-to-End Agentic Workflow:** Demonstrates advanced AI orchestration using LangGraph.
- **Semantic Matching:** Uses vector embeddings to search the database for semantic similarity
- **Professional UI:** Clean, responsive React interface suitable for portfolio presentation.
- **Extensible Architecture:** Modular design for easy extension and integration.

---

## Technologies Used

Resume Radar leverages a modern, scalable technology stack to deliver advanced AI-driven job matching and a seamless user experience:

- **React**: Builds the interactive front-end UI, enabling resume upload, profile parsing, job dashboard, and feedback components.
- **Express.js**: Powers the backend server, handling API requests, file uploads, and orchestration of agentic workflows.
- **MongoDB**: Stores job titles, descriptions, and associated vector embeddings for fast, flexible querying and semantic search.
- **LangGraph**: Implements the agentic workflow, managing multi-node reasoning and tool-calling for resume analysis and job fit assessment.
- **Ollama**: Provides local LLM and embedding models for generating vector representations of job data and powering semantic search.
- **@langchain/core & @langchain/openai**: Integrates LLMs and tools for resume parsing, job fit assessment, and career advice generation.
- **Multer**: Handles file uploads (PDF resumes) securely and efficiently.
- **pdf-parse**: Extracts text content from uploaded PDF resumes for further analysis.
- **Axios**: Facilitates HTTP requests for data fetching and integration.
- **Zod**: Ensures robust schema validation for API inputs and tool parameters.

This combination of technologies enables Resume Radar to deliver intelligent, agent-based job matching and career guidance in a robust, extensible platform.
