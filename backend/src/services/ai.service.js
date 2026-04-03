const { GoogleGenAI }  = require("@google/genai")
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema"); 



const ai = new GoogleGenAI({
    apiKey : process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe, based on the analysis of resume, self-describe and job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interviw"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to tak etc.")
    })).describe("Technical question that can be asked in the interview, along with their intention and how to answer them"),

    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question can be asked in the interviw"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to tak etc.")
    })).describe("Behavioral questions that can be asked in the interview, along with their intention and how to answer them"),

    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill in which the candidate is lacking and needs improvement"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it affects the candidate's chances of getting hired"),
    })).describe("List of skill gaps in the candidate's profile, along with their severity"),

    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. technical questions, behavioral questions, resume improvement etc."),
        tasks: z.array(z.string()).describe("The list of tasks to be completed on this day to follow the preparation plan, e.g. practice coding questions, mock interviews, update resume etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to improve their chances of getting hired")
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    
    const prompt = `
You MUST return ONLY JSON.

STRICT RULES:
- technicalQuestions must contain at least 3 items
- behavioralQuestions must contain at least 3 items
- skillGaps must contain at least 2 items
- preparationPlan must contain at least 5 days
- Do NOT return empty arrays

Schema:
${JSON.stringify(interviewReportSchema, null, 2)}

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`;


    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema)

        }
    })

    
    console.log(response.text);
    

}
module.exports = generateInterviewReport;