const express = require("express");
const cors = require("cors");

const { Binary } = require("bson");
const { MongoClient } = require("mongodb");
const { ChatOllama, OllamaEmbeddings } = require("@langchain/ollama");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { StateGraph, START, END } = require("@langchain/langgraph");
const { StructuredTool } = require("@langchain/core/tools");
const multer = require("multer");
const { z } = require("zod");
const axios = require("axios");
const fs = require("fs");
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const MONGO_URI =
  "mongodb+srv://sd6200:JQ7GhhWLZxgNyNAe@cluster0.aagcme2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "finalProject";
const COLLECTION_NAME = "embedded_jobs";

const OLLAMA_BASE_URL = "http://100.64.0.1:11434";
const EMBEDDING_FIELD = "description_embedding_qwen3";
const INDEX_NAME = "vector_index";

const EMBEDDING_FIELD_TITLE = "title_embedding_qwen3";
const INDEX_NAME_TITLE = "vector_index_1";

const LLM_MODEL = "gpt-oss:20b";
const EMBEDDING_MODEL = "qwen3-embedding";

const mongoClient = new MongoClient(MONGO_URI);

async function extractTextFromPdf(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(" ") + "\n";
  }
  return fullText;
}

class QueryJobsDatabaseTool extends StructuredTool {
  name = "QueryJobsDatabase";
  description =
    "Query jobs database to find relevant job listings based on a job description.";

  schema = z.object({
    numResults: z.number().describe("The number of search results to return."),
    query: z
      .string()
      .describe(
        "The search query: perhaps a job description or general job idea."
      ),
  });

  async _call({ numResults, query }) {
    try {
      await mongoClient.connect();
      //console.log("Connected to MongoDB");

      const db = mongoClient.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      // generate an embedding for the search query
      //console.log(`Generating embedding for: "${query}"`);
      const queryVector = await embeddings.embedQuery(query);
      const vectorBinary = Binary.fromFloat32Array(
        new Float32Array(queryVector)
      );

      // define the vector search pipeline
      const pipeline = [
        {
          $vectorSearch: {
            index: INDEX_NAME,
            path: EMBEDDING_FIELD,
            queryVector: vectorBinary,
            numCandidates: 100, // number of candidates to consider
            limit: numResults, // number of top results to return
          },
        },
        {
          // fields to return
          $project: {
            _id: 0,
            jobTitle: "$Job Title",
            jobDescription: "$Job Description",
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      // execute the query
      //console.log("Searching for similar jobs...");
      const results = await collection.aggregate(pipeline).toArray();

      return results;
    } catch (error) {
      console.error("An error occurred:", error);
      return [];
    } finally {
      await mongoClient.close();
      //console.log("Disconnected from MongoDB");
    }
  }
}

class QueryTitlesDatabaseTool extends StructuredTool {
  name = "QueryTitlesDatabase";
  description =
    "Query jobs database to find relevant job listings based on a job title.";

  schema = z.object({
    numResults: z.number().describe("The number of search results to return."),
    query: z
      .string()
      .describe(
        "The search query: perhaps a job description or general job idea."
      ),
  });

  async _call({ numResults, query }) {
    try {
      await mongoClient.connect();
      //console.log("Connected to MongoDB");

      console.log("QUERY TITLES DATABASE TOOL INVOKED");

      const db = mongoClient.db(DB_NAME);
      const collection = db.collection(COLLECTION_NAME);

      // generate an embedding for the search query
      //console.log(`Generating embedding for: "${query}"`);
      const queryVector = await embeddings.embedQuery(query);
      const vectorBinary = Binary.fromFloat32Array(
        new Float32Array(queryVector)
      );

      // define the vector search pipeline
      const pipeline = [
        {
          $vectorSearch: {
            index: INDEX_NAME_TITLE,
            path: EMBEDDING_FIELD_TITLE,
            queryVector: vectorBinary,
            numCandidates: 100, // number of candidates to consider
            limit: numResults, // number of top results to return
          },
        },
        {
          // fields to return
          $project: {
            _id: 0,
            jobTitle: "$Job Title",
            jobDescription: "$Job Description",
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      // execute the query
      //console.log("Searching for similar jobs...");
      const results = await collection.aggregate(pipeline).toArray();

      return results;
    } catch (error) {
      console.error("An error occurred:", error);
      return [];
    } finally {
      await mongoClient.close();
      //console.log("Disconnected from MongoDB");
    }
  }
}
class SummarizeJobSuggestionsTool extends StructuredTool {
  name = "SummarizeJobSuggestions";
  description =
    "Summarize suggested jobs and identify the most likely job to store for further analysis.";

  schema = z.object({
    summary: z
      .string()
      .describe(
        "A readable summary for the user listing the top 3–5 suspected jobs, with confidence percentages."
      ),
    suspectedJob: z
      .string()
      .describe(
        "The single most likely job (best match) to use for subsequent steps in reasoning or treatment planning."
      ),
  });

  async _call({ summary, suspectedJob }) {
    // You could store or log this if needed
    //("Top suspected job:", suspectedJob);
    //console.log("Summary for user:", summary);
    return { summary, suspectedJob };
  }
}
class ExtractResumeTool extends StructuredTool {
  name = "ExtractResume";
  description =
    "Extract key information from a resume, including skills, experience, and education.";

  // Schema defines what the tool expects as input
  schema = z.object({
    resumeText: z
      .string()
      .describe(
        "The full text content of the resume to extract information from."
      ),
  });

  // The _call method is what actually runs when the tool is invoked
  async _call({ resumeText }) {
    const prompt = `
You are an expert resume parser. Extract structured information from the following resume text.

Resume:
"""
${resumeText}
"""

Return a JSON object with this structure:
{
  "name": "Full name if available",
  "contact": "Email or phone if present",
  "skills": ["list", "of", "skills"],
  "experience": [
    {
      "job_title": "",
      "company": "",
      "years": "",
      "description": ""
    }
  ],
  "education": [
    {
      "degree": "",
      "school": "",
      "years": ""
    }
  ]
}
`;

    const response = await llm.invoke([new HumanMessage(prompt)]);
    return response.content;
  }
}

class AssessJobFitTool extends StructuredTool {
  name = "AssessJobFit";
  description =
    "Assess how well a candidate's resume matches a specific job description and provide a score and reasoning.";

  // Define inputs required by the tool
  schema = z.object({
    resumeData: z
      .string()
      .describe(
        "Structured JSON or text summary of the candidate's resume, including key skills and experience."
      ),
    jobDescription: z
      .string()
      .describe("The job description text for the position being evaluated."),
  });

  // Core tool logic
  async _call({ resumeData, jobDescription }) {
    const prompt = `
You are an expert career analyst. Compare the following résumé data and job description.

Résumé:
"""
${resumeData}
"""

Job Description:
"""
${jobDescription}
"""

Evaluate how well this candidate fits the position. Provide:
- A numeric match score between 0 and 100.
- A short explanation of why this score was assigned.
- Three specific skill or experience gaps (if any).
- Suggestions to improve the candidate’s suitability for the job.

Return the result as a JSON object with this structure:
{
  "match_score": 0-100,
  "reasoning": "",
  "skill_gaps": ["", "", ""],
  "suggestions": [""]
}
`;

    const response = await llm.invoke([new HumanMessage(prompt)]);
    return response.content;
  }
}

class AdviceTool extends StructuredTool {
  name = "CareerAdvice";
  description =
    "Provide personalized career advice based on job fit assessment results.";

  // Define expected input schema
  schema = z.object({
    assessmentResults: z
      .string()
      .describe(
        "The job fit assessment results in JSON or text format, including match score, reasoning, skill gaps, and suggestions."
      ),
    resumeData: z
      .string()
      .optional()
      .describe(
        "Optional structured résumé data to help give more tailored advice."
      ),
  });

  // Core logic for the tool
  async _call({ assessmentResults, resumeData }) {
    const prompt = `
You are an experienced career coach. Using the information provided, give detailed, constructive advice.

Assessment Results:
"""
${assessmentResults}
"""

${resumeData ? `Resume Data:\n"""\n${resumeData}\n"""` : ""}

Provide:
- A short summary of how the candidate is doing overall.
- Three actionable recommendations to improve their résumé or skills.
- Suggested job titles or roles they would be a strong fit for.
- Encouraging closing message.

Return your response as a JSON object with this structure:
{
  "summary": "",
  "recommendations": ["", "", ""],
  "suggested_roles": ["", "", ""],
  "encouragement": ""
}
`;

    const response = await llm.invoke([new HumanMessage(prompt)]);
    return response.content;
  }
}

class ResumeQualityTool extends StructuredTool {
  name = "ResumeQuality";
  description =
    "Evaluate the quality of a resume, including completeness, clarity, formatting, and keyword usage. Suggest improvements if needed.";

  schema = z.object({
    resumeData: z
      .string()
      .describe("Structured JSON or text summary of the candidate's resume."),
  });

  async _call({ resumeData }) {
    const prompt = `
You are an expert career consultant. Assess the quality of the following resume:

Resume Data:
"""
${resumeData}
"""

Provide:
- A score between 0 and 100 for overall quality.
- A short explanation for the score.
- Three specific areas where the resume could be improved (e.g., missing skills, formatting issues, unclear experience).
- Recommendations for next steps the candidate should take to improve the resume.

Return as JSON with this structure:
{
  "quality_score": 0-100,
  "explanation": "",
  "improvement_areas": ["", "", ""],
  "recommendations": ["", "", ""]
}
`;

    const response = await llm.invoke([new HumanMessage(prompt)]);
    const cleaned = response.content
      .trim()
      .replace(/^```json/i, "")
      .replace(/```$/i, "")
      .trim();

    return cleaned;
  }
}

const resumeQualityTool = new ResumeQualityTool();

const extractResumeTool = new ExtractResumeTool();
const queryJobsDatabaseTool = new QueryJobsDatabaseTool();
const assessJobFitTool = new AssessJobFitTool();
const adviceTool = new AdviceTool();
const summarizeJobSuggestionsTool = new SummarizeJobSuggestionsTool();
const queryTitlesDatabaseTool = new QueryTitlesDatabaseTool();

const llm = new ChatOpenAI({
  apiKey: "",
  configuration: {
    baseURL: "http://100.64.0.1:11434/v1",
  },
  model: LLM_MODEL,
  tools: [
    extractResumeTool,
    queryJobsDatabaseTool,
    assessJobFitTool,
    adviceTool,
    summarizeJobSuggestionsTool,
    resumeQualityTool,
    queryTitlesDatabaseTool,
  ],
});

const embeddings = new OllamaEmbeddings({
  baseUrl: OLLAMA_BASE_URL,
  model: EMBEDDING_MODEL,
});

const graphStateData = {
  userInput: "",
  desireJob: "",
  desireDuties: "",
  resumeData: "",
  jobResults: [],
  assessmentResults: "",
  advice: "",
  queryResults: null,
  resumeQuality: null,
  lowFitAdvice: "",
  mediumFitAdvice: "",
  highFitAdvice: "",
};

async function queryJobsNode(state) {
  console.log("Query JOBS");

  const toolResult = await queryJobsDatabaseTool.invoke({
    query: state.userInput,
    numResults: 5,
  });
  //console.log("TOOL RESULT:", toolResult);

  //   const message = new HumanMessage({
  //     content: [
  //       {
  //         type: "text",
  //         text: `Here are the results from querying relevant job listings based on user input. Evaluate and report back based on the tools available to you. ${JSON.stringify(
  //           toolResult
  //         )}`,
  //       },
  //     ],
  //   });

  const topJobs = toolResult
    .slice(0, 3)
    .map(
      (r, i) => `${i + 1}. ${r.jobTitle} (score ${(r.score * 100).toFixed(1)}%)`
    )
    .join("\n");

  const summaryText = `Top similar job listings:\n${topJobs}`;
  const suspectedJob = toolResult[0]?.jobTitle || "Unknown job";

  // 🪄 Use the summarization tool directly (statefully)
  const summarized = await summarizeJobSuggestionsTool.invoke({
    summary: summaryText,
    suspectedJob,
  });

  return {
    ...state,
    queryResults: toolResult,
    summary: summarized.summary,
    suspectedJob: summarized.suspectedJob,
  };
}
async function queryJobTitlesNode(state) {
  console.log("QUERY JOB TITLES NODE:");

  if (!state.desireJob) {
    console.warn("No desired job provided. Skipping title search.");
    return state;
  }

  // Call the job-title embedding search tool
  const toolResult = await queryTitlesDatabaseTool.invoke({
    query: state.desireJob,
    numResults: 5,
  });

  // Format top titles similar to your other summarization pattern
  const topJobs = toolResult
    .slice(0, 3)
    .map(
      (r, i) => `${i + 1}. ${r.jobTitle} (score ${(r.score * 100).toFixed(1)}%)`
    )
    .join("\n");

  const summaryText = `Top matching job titles for "${state.desireJob}":\n${topJobs}`;
  const suspectedJob = toolResult[0]?.jobTitle || "Unknown job";

  // Use your summarization tool
  const summarized = await summarizeJobSuggestionsTool.invoke({
    summary: summaryText,
    suspectedJob,
  });

  return {
    ...state,
    queryResults: toolResult,
    summary: summarized.summary,
    suspectedJob: summarized.suspectedJob,
  };
}

async function extractResumeNode(state) {
  // Call your tool
  const resumeResult = await extractResumeTool.invoke({
    resumeText: state.userInput,
  });

  // Update graph state
  return {
    ...state,
    resumeData: resumeResult,
  };
}
async function resumeQualityNode(state) {
  console.log("RESUME QUALITY STATE:");

  if (!state.resumeData) {
    console.error("No resume data available.");
    return state;
  }

  const qualityAssessment = await resumeQualityTool.invoke({
    resumeData: state.resumeData,
  });

  console.log("RESUME QUALITY ASSESSMENT:", qualityAssessment);

  // Optionally, branch based on quality_score later
  return {
    ...state,
    resumeQuality: qualityAssessment,
  };
}

async function assessFitNode(state) {
  console.log("ASSESS FIT STATE:");

  if (!state.resumeData || !state.queryResults?.length) {
    console.error("Missing resume or job results.");
    return state;
  }

  // Compare resume to the top job description
  const topJob = state.queryResults[0];
  const assessment = await assessJobFitTool.invoke({
    resumeData: state.resumeData,
    jobDescription: topJob.jobDescription,
  });

  // Get career advice
  const advice = await adviceTool.invoke({
    assessmentResults: assessment,
    resumeData: state.resumeData,
  });

  return {
    ...state,
    assessmentResults: assessment,
    advice: advice,
  };
}

async function incompleteResumeNode(state) {
  console.log("INCOMPLETE RESUME NODE STATE:");
  if (!state.resumeQuality) {
    console.error("No resume quality assessment available.");
    return state;
  }

  // Parse quality score and recommendations (assuming JSON string from LLM)
  let qualityRaw = state.resumeQuality;

  // Normalize any code fences
  const cleaned = qualityRaw
    .trim()
    .replace(/^```json/i, "")
    .replace(/```$/i, "")
    .trim();

  let quality;
  try {
    quality = JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse cleaned resume quality JSON:", err);
    return state;
  }

  // Only trigger if score is low
  if (quality.quality_score < 70) {
    const improvementMessage = `
Your resume quality score is ${quality.quality_score}/100.
Areas to improve: ${quality.improvement_areas.join(", ")}.
Recommendations: ${quality.recommendations.join("; ")}.
Consider updating your resume before continuing to job applications.
`;

    //console.log("Incomplete resume feedback:", improvementMessage);

    return {
      ...state,
      incompleteResumeFeedback: improvementMessage,
      canProceed: false, // flag to prevent moving forward
    };
  } else {
    return {
      ...state,
      canProceed: true,
    };
  }
}

async function lowFitNode(state) {
  console.log("LOW FIT NODE STATE:");
  let assessment = JSON.parse(
    state.assessmentResults
      .replace(/^```json/i, "")
      .replace(/```$/i, "")
      .trim()
  );

  const score = assessment.match_score;

  if (score < 25) {
    const toolResult = await queryJobsDatabaseTool.invoke({
      query: state.resumeData,
      numResults: 5,
    });

    return {
      ...state,
      lowFitAdvice: `
Your match score for the desired job was very low (${score}/100).
Here are jobs you may be a much better fit for:

${toolResult
  .map((r, i) => `${i + 1}. ${r.jobTitle} — ${(r.score * 100).toFixed(1)}%`)
  .join("\n")}
`,
    };
  }

  const prompt = `
Create a career plan for someone who wants to become a "${state.desireJob}" but currently has a low fit score based on this resume ${state.resumeData}.

Assessment:
${state.assessmentResults}

Return a friendly plan with:
- Required skills they are missing
- Certifications or courses to take
- 6-month roadmap
- 1–2 entry-level roles to transition through
`;

  const result = await llm.invoke([new HumanMessage(prompt)]);

  return {
    ...state,
    lowFitAdvice: result.content,
  };
}

async function mediumFitNode(state) {
  console.log("MEDIUM FIT NODE STATE:");
  const prompt = `
The candidate has a medium match score for "${state.desireJob}".

Assessment:
${state.assessmentResults}

Provide:
- Top areas they should improve
- Specific skills to add
- Concrete resume fixes
- Small steps to raise match score into the "high fit" range
`;

  const result = await llm.invoke([new HumanMessage(prompt)]);

  return {
    ...state,
    mediumFitAdvice: result.content,
  };
}

async function highFitNode(state) {
  console.log("HIGH FIT NODE STATE:");
  const prompt = `
The candidate has a high match score for "${state.desireJob}".

Assessment:
${state.assessmentResults}

Provide:
- A short congratulations message
- Next steps to apply
- Interview prep checklist
- How to tailor their resume, ${state.resumeData} for final polish
`;

  const result = await llm.invoke([new HumanMessage(prompt)]);

  return {
    ...state,
    highFitAdvice: result.content,
  };
}

function routingFunction(state) {
  //console.log("ROUTING FUNCTION STATE:", state);

  if (!state.resumeQuality) {
    console.warn("No resume quality available, defaulting to 'queryJobsNode'");
    if (state.desireJob && state.desireJob.trim() !== "") {
      return "queryJobTitlesNode";
    } else {
      return "queryJobsNode";
    }
  }

  let qualityObj = state.resumeQuality;

  // If resumeQuality is a string (possibly from LLM), clean and parse it
  if (typeof qualityObj === "string") {
    try {
      const cleaned = qualityObj
        .trim()
        .replace(/^```json\s*/, "")
        .replace(/```$/, "");
      qualityObj = JSON.parse(cleaned);
    } catch (err) {
      console.error(
        "Failed to parse resumeQuality JSON, defaulting to queryJobsNode:",
        err
      );
      if (state.desireJob && state.desireJob.trim() !== "") {
        return "queryJobTitlesNode";
      } else {
        return "queryJobsNode";
      }
    }
  }

  // Check quality score safely
  const score = qualityObj.quality_score;
  if (typeof score !== "number") {
    console.warn(
      "Quality score is missing or invalid, defaulting to 'queryJobsNode'"
    );
    return "queryJobsNode";
  }

  // Routing based on score
  if (score <= 50) {
    return "incompleteResumeNode";
  } else {
    return "queryJobsNode";
  }
}

function fitRoutingFunction(state) {
  let assessmentRaw = state.assessmentResults;
  console.log("HERE IN FIT ROUTING FUNCTION");

  // Clean JSON fences
  const cleaned = assessmentRaw
    .trim()
    .replace(/^```json/i, "")
    .replace(/```$/i, "")
    .trim();

  let assessment;
  try {
    assessment = JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse assessment JSON:", err);
    return "mediumFitNode"; // default fallback
  }

  const score = assessment.match_score;

  if (score < 40) return "lowFitNode";
  if (score < 75) return "mediumFitNode";
  return "highFitNode";
}

const workflow = new StateGraph({ channels: graphStateData });
workflow.addNode("extractResumeNode", extractResumeNode);
workflow.addNode("resumeQualityNode", resumeQualityNode);
workflow.addNode("queryJobsNode", queryJobsNode);
workflow.addNode("assessFitNode", assessFitNode);
workflow.addNode("incompleteResumeNode", incompleteResumeNode);
workflow.addNode("queryJobTitlesNode", queryJobTitlesNode);
workflow.addNode("lowFitNode", lowFitNode);
workflow.addNode("mediumFitNode", mediumFitNode);
workflow.addNode("highFitNode", highFitNode);

workflow.addEdge(START, "extractResumeNode");
workflow.addEdge("extractResumeNode", "resumeQualityNode");
workflow.addConditionalEdges("resumeQualityNode", routingFunction, [
  "incompleteResumeNode",
  "queryJobTitlesNode",
  "queryJobsNode",
]);

workflow.addEdge("queryJobTitlesNode", "assessFitNode");

workflow.addEdge("queryJobsNode", "assessFitNode");
workflow.addConditionalEdges("assessFitNode", fitRoutingFunction, [
  "lowFitNode",
  "mediumFitNode",
  "highFitNode",
]);
workflow.addEdge("lowFitNode", END);
workflow.addEdge("mediumFitNode", END);
workflow.addEdge("highFitNode", END);
workflow.addEdge("incompleteResumeNode", END);

const graph = workflow.compile();

app.post("/upload-resume", upload.single("resume"), async (req, res) => {
  try {
    const { jobTitle, duties } = req.body;
    if (!jobTitle || !duties) {
      return res
        .status(400)
        .json({ error: "Job title and duties are required." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No resume file uploaded." });
    }

    // 🧠 Extract text from the uploaded PDF
    const pdfBuffer = req.file.buffer;
    const pdfData = await pdfParse(pdfBuffer);
    const resumeText = pdfData.text;

    // Run your agent graph starting with the extracted text
    const result = await graph.invoke({
      userInput: resumeText, // feeds into extractResumeNode
      desireDuties: duties,
      desireJob: jobTitle,
    });

    console.log("GRAPH RESULT:", result);
    res.json(result);
  } catch (error) {
    console.error("Error handling resume upload:", error);
    res.status(500).json({ error: "Failed to process resume upload." });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
