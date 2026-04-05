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

    const {
        report, setReport,
        reports, setReports,
        error, setError,
        generatingReport, setGeneratingReport,
        fetchingReport, setFetchingReport,
        fetchingReports, setFetchingReports,
        downloadingResume, setDownloadingResume,
    } = context


    const extractErrorMessage = (error) => {
        if (error?.response?.data?.errors?.length > 0) {
            return error.response.data.errors.join(", ")
        }
        if (error?.response?.data?.message) {
            return error.response.data.message
        }
        // ✅ Timeout error — interview.api.js interceptor se aata hai
        if (error?.code === "ECONNABORTED" || error?.message?.includes("timed out")) {
            return "Request timed out. AI is taking too long, please try again."
        }
        if (error?.message === "Network Error") {
            return "Unable to connect to server. Please check your internet connection."
        }
        return "Something went wrong. Please try again."
    }


    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setGeneratingReport(true)
        setError(null)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            const message = extractErrorMessage(error)
            setError(message)
            console.error("generateReport Error:", error)
            return null
        } finally {
            setGeneratingReport(false)
        }
    }


    const getReportById = async (interviewId, isMounted) => {
        setFetchingReport(true)  // ✅ Sirf fetch loading
        setError(null)
        try {
            const response = await getInterviewReportById(interviewId)
            // ✅ isMounted check — unmount ke baad state update mat karo
            if (isMounted?.current) {
                setReport(response.interviewReport)
            }
            return response.interviewReport
        } catch (error) {
            if (isMounted?.current) {
                const message = extractErrorMessage(error)
                setError(message)
            }
            console.error("getReportById Error:", error)
            return null
        } finally {
            if (isMounted?.current) {
                setFetchingReport(false)
            }
        }
    }


    const getReports = async (isMounted) => {
        setFetchingReports(true)  // ✅ Sirf reports fetch loading
        setError(null)
        try {
            const response = await getAllInterviewReports()
            // ✅ isMounted check
            if (isMounted?.current) {
                setReports(response.interviewReports)
            }
            return response.interviewReports
        } catch (error) {
            if (isMounted?.current) {
                const message = extractErrorMessage(error)
                setError(message)
            }
            console.error("getReports Error:", error)
            return null
        } finally {
            if (isMounted?.current) {
                setFetchingReports(false) 
            }
        }
    }


    const getResumePdf = async (interviewReportId) => {
        setDownloadingResume(true)  // ✅ Sirf download loading
        setError(null)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            const message = extractErrorMessage(error)
            setError(message)
            console.error("getResumePdf Error:", error)
        } finally {
            setDownloadingResume(false)
        }
    }


    useEffect(() => {
        /**
         * ✅ useRef jaisa pattern — object reference use karo
         * Boolean primitive copy hoti hai — object reference nahi
         * isMounted.current = false karne se sab jagah reflect hoga
         */
        const isMounted = { current: true }

        const fetchData = async () => {
            if (interviewId) {
                await getReportById(interviewId, isMounted)  // ✅ pass karo
            } else {
                await getReports(isMounted)                  // ✅ pass karo
            }
        }

        fetchData()

        return () => {
            isMounted.current = false  // ✅ Ab sach mein kaam karega
        }
    }, [ interviewId ])


    return { // ✅ Granular loading states
        generatingReport, fetchingReport, fetchingReports, downloadingResume, error, report, reports, generateReport, getReportById, getReports, getResumePdf }
}