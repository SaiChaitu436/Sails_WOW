import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, ProgressBar } from "react-bootstrap";
import { ArrowLeft, CheckCircle2, Clock, LogOut, Lock } from "lucide-react";
import axios from "axios";
import "../styles.css";
import "./Dashboard.css";

const COMPETENCIES = [
  {
    id: "Communication",
    name: "COMMUNICATION",
    color: "#0001fc",
    image: "/images/communication.png",
    questions: 25,
    order: 1,
  },
  {
    id: "Adaptability & Learning Agility",
    name: "ADAPTABILITY & LEARNING AGILITY",
    color: "#d87e1d",
    image: "/images/adaptability.png",
    questions: 25,
    order: 2,
  },
  {
    id: "Teamwork & Collaboration",
    name: "TEAMWORK & COLLABORATION",
    color: "#41b64d",
    image: "/images/teamwork.png",
    questions: 25,
    order: 3,
  },
  {
    id: "Accountability & Ownership",
    name: "ACCOUNTABILITY & OWNERSHIP",
    color: "#880a0d",
    image: "/images/accountability.png",
    questions: 25,
    order: 4,
  },
  {
    id: "Problem Solving & Critical Thinking",
    name: "PROBLEM SOLVING & CRITICAL THINKING",
    color: "#9338c3",
    image: "/images/problem-solving.png",
    questions: 25,
    order: 5,
  },
];

const createGradient = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Create darker version for gradient
  const darkerR = Math.max(0, r - 30);
  const darkerG = Math.max(0, g - 30);
  const darkerB = Math.max(0, b - 30);

  const darkerHex = `#${darkerR.toString(16).padStart(2, "0")}${darkerG
    .toString(16)
    .padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;

  return `linear-gradient(135deg, ${hexColor} 0%, ${darkerHex} 100%)`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [currentBand, setCurrentBand] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState("Not Taken");
  const [completedDate, setCompletedDate] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [questionsData, setQuestionsData] = useState({});
  const [competencyProgress, setCompetencyProgress] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const getQuestions = (band) => {
    axios
      .get(`http://localhost:8000/bands/band${band}/random-questions`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        const questionsByCategory = response.data.questions;

        // Map raw category text to competency IDs
        const categoryToCompetency = {
          "Self evaluation Communication": "Communication",
          "Self evalauation Adaptability & Learning Agility":
            "Adaptability & Learning Agility",
          "Self evaluation Teamwork & Collaboration":
            "Teamwork & Collaboration",
          "Self evalauation Accountability & Ownership":
            "Accountability & Ownership",
          "Self evaluation Problem Solving & Critical Thinking":
            "Problem Solving & Critical Thinking",
        };

        // Transform the API response (already grouped by category) to competency IDs
        const grouped = {};
        
        // Iterate through each category in the API response
        Object.keys(questionsByCategory).forEach((categoryName) => {
          // Convert category name → correct competency id
          const compId = categoryToCompetency[categoryName];
          
          if (compId) {
            // Sort questions alphabetically for consistent order
            const questions = [...questionsByCategory[categoryName]];
            grouped[compId] = questions;
          }
        });

        setQuestionsData(grouped);
      })
      .catch((error) => {
        console.error("There was an error fetching the questions!", error);
      });
  };

  const getBandData = () => {
    axios
      .get("http://localhost:8000/employeeData/SS005", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        getQuestions(response.data.Agreed_Band);
        setUserName(response.data.Employee_Name);
        setCurrentBand(response.data.Agreed_Band);
      })
      .catch((error) => {
        console.error("There was an error fetching the band data!", error);
      });
  };

  const getHistory = () => {
    axios
      .get(`http://localhost:8000/assessment/history/SS005`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        if (response.data && response.data.history) {
          // Transform the API response to match the expected format
          const formattedHistory = response.data.history.map((item) => ({
            band: item.band,
            overallScore: item.overallScore,
            passed: item.passed,
            completedDate: item.completedDate,
            categoryScores: item.categoryScores
          }));
          setAssessmentHistory(formattedHistory);
        }
      })
      .catch((error) => {
        console.error("There was an error fetching assessment history!", error);
      });
  }

  useEffect(() => {
    getBandData();
    getHistory();
  }, []);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));

    // Check if there's an in-progress assessment
    const progress = localStorage.getItem("assessmentProgress");
    let progressMap = {};
    if (progress) {
      setAssessmentStatus("In Progress");
      // Calculate competency progress
      const progressData = JSON.parse(progress);
      const answers = progressData.answers || {};

      COMPETENCIES.forEach((comp, index) => {
        let answered = 0;
        for (let q = 0; q < comp.questions; q++) {
          const key = `category-${index}-question-${q}`;
          if (answers[key] && answers[key].response) {
            answered++;
          }
        }
        progressMap[comp.id] = answered;
      });
    }

    // Load completed categories (API-synced only)
    const completedCategories = localStorage.getItem("completedCategories");
    if (completedCategories) {
      const completedMap = JSON.parse(completedCategories);
      // Convert category-{index} keys to competency IDs
      COMPETENCIES.forEach((comp, index) => {
        const key = `category-${index}`;
        const categoryData = completedMap[key];
        // Only count as progress if API synced
        if (categoryData && categoryData.apiSynced) {
          progressMap[comp.id] = categoryData.questionsCount || 25;
        }
      });
    }

    // Also check legacy completedCompetencies for backward compatibility
    const completed = localStorage.getItem("completedCompetencies");
    if (completed) {
      const completedMap = JSON.parse(completed);
      COMPETENCIES.forEach((comp, index) => {
        const key = `category-${index}`;
        // Only use if not already set from completedCategories
        if (!progressMap[comp.id] && completedMap[key]) {
          // Legacy data - check if we can verify API sync
          const categoryKey = `category-${index}`;
          const categoryData = JSON.parse(localStorage.getItem("completedCategories") || "{}")[categoryKey];
          if (categoryData?.apiSynced) {
            progressMap[comp.id] = completedMap[key];
          }
        }
      });
    }

    setCompetencyProgress(progressMap);

    // Check for toast message
    const justCompleted = sessionStorage.getItem("justCompleted");
    if (justCompleted) {
      setToastMessage(justCompleted);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        sessionStorage.removeItem("justCompleted");
      }, 4000);
    }
  }, [navigate]);

  const handleCompetencyClick = async (competency) => {
    // Check if assessment can be taken (not on cooldown)
    if (!canTakeAssessment() && assessmentStatus === "completed") {
      setToastMessage(
        `Assessment available in ${getDaysUntilNextAssessment()} days`
      );
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return;
    }

    // Check if the competency is unlocked
    if (!isUnlocked(competency)) {
      return;
    }

    // Set the category index based on competency order (0-indexed)
    const categoryIndex = competency.order - 1;
    
    // Check if this category is completed
    const isCompleted = isCategoryCompletedAndSynced(categoryIndex);
    
    if (isCompleted) {
      // For completed categories, fetch questions and answers from API
      try {
        const employeeId = user?.id || user?.employeeId || user?.employee_id || 'SS005';
        const response = await axios.get(
          `http://localhost:8000/assessment/${competency.id}/${employeeId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            }
          }
        );

        if (response.data && response.data.answers) {
          // Extract questions and answers from API response
          const apiAnswers = response.data.answers;
          
          // Extract unique questions and sort them alphabetically for consistent order
          const uniqueQuestions = [...new Set(apiAnswers.map(item => item.question))];
          
          // Create a map of question to answer for quick lookup
          const questionToAnswer = {};
          apiAnswers.forEach((apiAnswer) => {
            questionToAnswer[apiAnswer.question] = apiAnswer.answer_value;
          });
          
          // Map answers by question index (matching sorted question order)
          const answersFromAPI = {};
          uniqueQuestions.forEach((question, index) => {
            answersFromAPI[`category-${categoryIndex}-question-${index}`] = {
              response: questionToAnswer[question],
              timestamp: apiAnswers.find(a => a.question === question)?.updated_at,
              fromAPI: true
            };
          });

          // Navigate with API data
          navigate(`/assessment?category=${categoryIndex}`, {
            state: {
              useAPIData: true,
              questions: { [competency.id]: uniqueQuestions },
              answers: answersFromAPI,
              categoryName: competency.id
            }
          });
        } else {
          // Fallback to state data if API fails
          navigate(`/assessment?category=${categoryIndex}`, { state: questionsData });
        }
      } catch (error) {
        console.error('Error fetching completed assessment data:', error);
        // Fallback to state data if API fails
        navigate(`/assessment?category=${categoryIndex}`, { state: questionsData });
      }
    } else {
      // For incomplete categories, use state data
      navigate(`/assessment?category=${categoryIndex}`, { state: questionsData });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) {
    return null;
  }

  const getProgressPercentage = (competencyId) => {
    const progress = competencyProgress[competencyId] || 0;
    return (progress / 25) * 100;
  };

  // Check if category is completed AND synced with API
  const isCategoryCompletedAndSynced = (categoryIndex) => {
    const completedCategories = localStorage.getItem('completedCategories') || '{}';
    const completedMap = JSON.parse(completedCategories);
    const categoryKey = `category-${categoryIndex}`;
    return completedMap[categoryKey]?.apiSynced === true;
  };

  const isCompleted = (competencyId) => {
    // Find the category index for this competency
    const categoryIndex = COMPETENCIES.findIndex(c => c.id === competencyId);
    if (categoryIndex === -1) return false;
    
    // Check if it's completed AND API synced
    return isCategoryCompletedAndSynced(categoryIndex);
  };

  const isUnlocked = (competency) => {
    // First card (order 1) is always unlocked
    if (competency.order === 1) {
      return true;
    }
    
    // For other cards, check if the previous card is completed AND API synced
    const previousCompetency = COMPETENCIES.find(
      (c) => c.order === competency.order - 1
    );
    if (previousCompetency) {
      return isCompleted(previousCompetency.id);
    }
    
    return false;
  };

  const getDaysUntilNextAssessment = () => {
    if (!completedDate) return 0;
    const daysSinceCompletion = Math.floor(
      (new Date().getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, 45 - daysSinceCompletion);
  };

  const canTakeAssessment = () => {
    if (assessmentStatus === "Not Taken" || assessmentStatus === "In Progress")
      return true;
    if (assessmentStatus === "completed") {
      return getDaysUntilNextAssessment() === 0;
    }
    return true;
  };

  return (
    <div className="dashboard-container">
      <Container className="py-4">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="d-flex align-items-center">
            <ArrowLeft
              className="header-icon"
              onClick={() => window.history.back()}
              style={{ cursor: "pointer", marginRight: "16px" }}
            />
            <div>
              <h1 className="dashboard-title">Employee Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back, {userName}</p>
            </div>
          </div>
          <div className="d-flex align-items-center">
            <div className="band-badge">{currentBand}</div>
            <LogOut
              className="header-icon"
              onClick={handleLogout}
              style={{ cursor: "pointer", marginLeft: "16px" }}
            />
          </div>
        </div>

        {/* Current Band and Assessment Status Cards */}
        <div className="row mb-4">
          <div className="col-md-6 mb-3">
            <Card className="card-base info-card">
              <Card.Body>
                <h6 className="card-label">Current Band</h6>
                <div className="d-flex align-items-center justify-content-between">
                  <p className="card-value">{currentBand}</p>
                  <Clock className="info-icon blue-icon" />
                </div>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-6 mb-3">
            <Card className="card-base info-card">
              <Card.Body>
                <h6 className="card-label">Band Assessment Status</h6>
                <div className="d-flex align-items-center justify-content-between">
                  <p className="card-value">
                    {assessmentStatus === "completed"
                      ? "Completed"
                      : assessmentStatus === "In Progress"
                      ? "In Progress"
                      : "Not Taken"}
                  </p>
                  {assessmentStatus === "completed" ? (
                    <CheckCircle2
                      className="info-icon"
                      style={{ color: "#4caf50" }}
                    />
                  ) : (
                    <Clock className="info-icon orange-icon" />
                  )}
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* 45-Day Timer Display */}
        {assessmentStatus === "completed" &&
          getDaysUntilNextAssessment() > 0 && (
            <Card
              className="card-base mb-4"
              style={{
                backgroundColor: "#e3f2fd",
                border: "1px solid #4a90e2",
              }}
            >
              <Card.Body>
                <div className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      backgroundColor: "#4a90e2",
                      borderRadius: "50%",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Clock
                      className="info-icon"
                      style={{ color: "white", fontSize: "24px" }}
                    />
                  </div>
                  <div>
                    <p
                      className="mb-1"
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#333",
                      }}
                    >
                      Next Assessment Available In
                    </p>
                    <p
                      className="mb-0"
                      style={{
                        fontSize: "28px",
                        fontWeight: 700,
                        color: "#4a90e2",
                      }}
                    >
                      {getDaysUntilNextAssessment()} days
                    </p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          )}

        {/* WoW Section */}
        <Card className="wow-section mb-4">
          <Card.Body>
            <div className="text-center mb-3">
              <p className="wow-title">WoW</p>
              <p className="wow-subtitle">Way of Working</p>
              <p className="wow-instruction">
                Click on a card to start your competency assessment
              </p>
            </div>

            <div className="competency-cards-container p-3">
              {COMPETENCIES.map((competency) => {
                const progress = getProgressPercentage(competency.id);
                const completed = isCompleted(competency.id);
                const unlocked = isUnlocked(competency);
                const gradientStyle = {
                  background: createGradient(competency.color),
                  color: "white",
                };
                const badgeStyle = {
                  backgroundColor: competency.color,
                };

                return (
                  <Card
                    key={competency.id}
                    className={`card-base competency-card ${
                      !unlocked ? "competency-locked" : ""
                    }`}
                    onClick={() => handleCompetencyClick(competency)}
                    style={{
                      cursor: unlocked ? "pointer" : "not-allowed",
                      ...gradientStyle,
                    }}
                  >
                    <Card.Body className="competency-card-body">
                      {!unlocked && <Lock className="competency-lock" />}
                      <div className="competency-icon-wrapper" style={{ position: 'relative' }}>
                        <img
                          src={competency.image}
                          alt={competency.name}
                          className="competency-icon"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        {completed && unlocked && (
                          <CheckCircle2 
                            className="competency-completed-badge"
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              width: '32px',
                              height: '32px',
                              color: 'white',
                              backgroundColor: 'rgba(76, 175, 80, 0.9)',
                              borderRadius: '50%',
                              padding: '4px',
                              zIndex: 5
                            }}
                          />
                        )}
                      </div>

                      <h5 className="competency-name">{competency.name}</h5>

                      {/* ✅ Use ACTUAL QUESTION COUNT */}
                      <p className="competency-questions">
                        {questionsData[competency.id]?.length || 0} questions
                      </p>

                      {progress > 0 && (
                        <div className="competency-progress-container">
                          <ProgressBar
                            now={progress}
                            className="competency-progress-bar"
                          />
                        </div>
                      )}

                      <div className="badge-number" style={badgeStyle}>
                        {competency.order}
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </Card.Body>
        </Card>

        {/* Assessment History Card */}
        <Card className="card-base history-card">
          <Card.Body>
            <h5 className="history-title">Assessment History</h5>
            {assessmentHistory.length === 0 ? (
              <p className="history-empty">No completed assessments yet</p>
            ) : (
              <div className="history-list">
                {assessmentHistory.map((assessment, index) => (
                  <div key={index} className="history-item">
                    <div>
                      <strong>Band {assessment.band} Assessment</strong>
                      <p className="mb-0 text-muted">
                        Completed on{" "}
                        {new Date(
                          assessment.completedDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-end">
                      <div className="score">{assessment.overallScore}%</div>
                      <div
                        className={`status ${
                          assessment.passed ? "passed" : "failed"
                        }`}
                      >
                        {assessment.passed ? "Passed" : "Failed"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast-notification">
          <div className="toast-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                fill="#4a90e2"
              />
            </svg>
          </div>
          <div>
            <strong>Completed!</strong>
            <p className="mb-0">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
