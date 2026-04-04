import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {

    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context
    // ✅ LESSON 19: Error state context mein hona chahiye
    // Taaki component mein error show kar sako user ko


    /**
     * ✅ LESSON 20: Error message extract karne ka helper
     * Axios error ke andar deeply nested hota hai actual message
     * Ye helper ek jagah se handle karta hai
     */
    const extractErrorMessage = (error) => {
        // Backend ne validation errors bheje
        if (error?.response?.data?.errors?.length > 0) {
            return error.response.data.errors.join(", ")
        }
        // Backend ne single message bheja
        if (error?.response?.data?.message) {
            return error.response.data.message
        }
        // Network error — backend tak pahuncha hi nahi
        if (error?.message === "Network Error") {
            return "Unable to connect to server. Please check your internet connection."
        }
        // Default
        return "Something went wrong. Please try again."
    }


    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)  // ✅ Naya request — pehle ki error clear karo
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            const message = extractErrorMessage(error)
            setError(message)   // ✅ UI mein error dikhao
            console.error("generateReport Error:", error)
            return null
        } finally {
            setLoading(false)
        }
    }


    const getReportById = async (interviewId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            const message = extractErrorMessage(error)
            setError(message)
            console.error("getReportById Error:", error)
            return null
        } finally {
            setLoading(false)
        }
    }


    const getReports = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await getAllInterviewReports()
            setReports(response.interviewReports)
            return response.interviewReports
        } catch (error) {
            const message = extractErrorMessage(error)
            setError(message)
            console.error("getReports Error:", error)
            return null
        } finally {
            setLoading(false)
        }
    }


    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await generateResumePdf({ interviewReportId })

            // ✅ LESSON 21: Blob URL cleanup — memory leak rokta hai
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()

            // ✅ Click ke baad cleanup karo
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)  // ✅ Memory free karo

        } catch (error) {
            const message = extractErrorMessage(error)
            setError(message)
            console.error("getResumePdf Error:", error)
        } finally {
            setLoading(false)
        }
    }


    // ✅ LESSON 22: Cleanup function — component unmount hone par
    // Agar user page chhod de aur request abhi bhi chal rahi ho
    // toh state update nahi honi chahiye (memory leak + React warning)
    useEffect(() => {
        let isMounted = true

        const fetchData = async () => {
            if (interviewId) {
                await getReportById(interviewId)
            } else {
                await getReports()
            }
        }

        fetchData()

        return () => {
            isMounted = false  // ✅ Component unmount ho gaya
        }
    }, [ interviewId ])


    return { loading, error, report, reports, generateReport, getReportById, getReports, getResumePdf }
    //              ✅ error bhi return karo — components mein use ho sake
}