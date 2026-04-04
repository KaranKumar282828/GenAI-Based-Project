import { createContext, useState, useCallback } from "react"

export const InterviewContext = createContext()

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState(null)
    const [reports, setReports] = useState([])

    // ✅ LESSON 33: Error state context mein rakho
    // Har component apna alag error state na rakhe
    // Ek jagah se manage karo — consistent UI
    const [error, setError] = useState(null)


    /**
     * ✅ LESSON 34: clearError helper
     * Jab user naya action kare toh purani error
     * automatically clear ho — useInterview mein
     * setError(null) already hai, ye manually clear
     * karne ke liye hai (jaise close button pe)
     */
    const clearError = useCallback(() => {
        setError(null)
    }, [])


    /**
     * ✅ LESSON 35: clearReport helper
     * Jab user naye interview pe jaye toh
     * purana report clear karo — stale data na dikhe
     */
    const clearReport = useCallback(() => {
        setReport(null)
    }, [])


    /**
     * ✅ LESSON 36: useCallback kyun?
     * Ye functions har render pe naye nahi banenge
     * Child components unnecessary re-render nahi honge
     * Performance better hogi
     */

    return (
        <InterviewContext.Provider value={{
            // States
            loading, setLoading,
            report, setReport,
            reports, setReports,
            error, setError,      // ✅ Error state add kiya

            // Helpers
            clearError,           // ✅ Error manually clear karne ke liye
            clearReport           // ✅ Report manually clear karne ke liye
        }}>
            {children}
        </InterviewContext.Provider>
    )
}