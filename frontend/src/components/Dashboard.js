import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, ProgressBar } from "react-bootstrap";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import axios from "axios";
import "../styles.css";
import "./Dashboard.css";
import * as dateFns from "date-fns"

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
  const [expandedHistory, setExpandedHistory] = useState({});
  const [expandedScores, setExpandedScores] = useState({});

  const getQuestions = (band, category) => {
    // Ensure band format is correct (add 'band' prefix if not present)
    const bandName = band.startsWith('band') ? band : `band${band}`;

    axios
      .get(`http://localhost:8000/bands/${bandName}/random-questions`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        console.log('API Response:', response.data);
        const data = response.data.questions;

        // Map Competency values from database to frontend competency IDs
        // The Competency field from the database should match the competency IDs
        const competencyMapping = {
          "Communication": "Communication",
          "Adaptability & Learning Agility": "Adaptability & Learning Agility",
          "Teamwork & Collaboration": "Teamwork & Collaboration",
          "Accountability & Ownership": "Accountability & Ownership",
          "Problem Solving & Critical Thinking": "Problem Solving & Critical Thinking",
        };

        // Log unique Competency values for debugging
        const uniqueCompetencies = [...new Set(data.map(item => item.Competency || item.competency).filter(Boolean))];
        console.log('Unique Competency values from API:', uniqueCompetencies);

        const grouped = data.reduce((acc, item) => {
          // Use Competency field from database (case-insensitive matching)
          const competency = item.Competency || item.competency;
          const questionText = item.Question || item.question;

          if (!competency || !questionText) {
            console.warn('Missing Competency or Question in item:', item);
            return acc;
          }

          // Normalize competency name (trim, lowercase for comparison)
          const normalizedCompetency = competency.trim().toLowerCase();

          // Find matching competency ID (case-insensitive with normalization)
          const compId = Object.keys(competencyMapping).find(
            key => key.trim().toLowerCase() === normalizedCompetency
          );

          if (!compId) {
            // Try direct match first
            const directMatch = competencyMapping[competency];
            if (directMatch) {
              if (!acc[directMatch]) acc[directMatch] = [];
              acc[directMatch].push(questionText);
              return acc;
            }
            console.warn(`No mapping found for Competency: "${competency}"`);
            return acc; // skip if no match
          }

          if (!acc[compId]) acc[compId] = [];
          acc[compId].push(questionText);

          return acc;
        }, {});

        console.log('Grouped questions by Competency:', grouped);
        setQuestionsData(grouped);
      })
      .catch((error) => {
        console.error("There was an error fetching the questions!", error);
      });
  };

  const getBandData = () => {
    const userData = localStorage.getItem("user");
    if (!userData) return;

    const parsedUser = JSON.parse(userData);
    const employeeId = parsedUser.id || parsedUser.employeeId || parsedUser.employee_id || 'SS005';

    axios
      .get(`http://localhost:8000/employeeData/${employeeId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        const band = response.data.Agreed_Band || response.data.agreed_band;
        getQuestions(band);
        setUserName(response.data.Employee_Name || response.data.employee_name);
        setCurrentBand(band);
      })
      .catch((error) => {
        console.error("There was an error fetching the band data!", error);
      });
  };

  const getAssessmentHistory = () => {
    const userData = localStorage.getItem("user");
    if (!userData) return;

    const parsedUser = JSON.parse(userData);
    const employeeId = parsedUser.id || parsedUser.employeeId || parsedUser.employee_id || 'SS005';

    axios
      .get(`http://localhost:8000/assessment/history/${employeeId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        if (response.data && response.data.history) {
          setAssessmentHistory(response.data.history);

          // Update assessment status based on history
          const currentBandHistory = response.data.history.find(h => h.band === currentBand);
          if (currentBandHistory) {
            if (currentBandHistory.status === "Completed") {
              setAssessmentStatus("completed");
              if (currentBandHistory.completed_at) {
                setCompletedDate(new Date(currentBandHistory.completed_at));
              }
            } else {
              setAssessmentStatus("In Progress");
            }
          }
        }
      })
      .catch((error) => {
        console.error("There was an error fetching assessment history!", error);
      });
  };

  useEffect(() => {
    // Check server start time to detect server restarts
    const checkServerRestart = async () => {
      try {
        const response = await axios.get('http://localhost:8000/server/start-time', {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        });

        const serverStartTime = response.data.start_time;
        const storedStartTime = localStorage.getItem('serverStartTime');

        // If server start time changed, server was restarted - clear assessment localStorage
        if (storedStartTime && parseFloat(storedStartTime) !== serverStartTime) {
          console.log('Server restarted detected, clearing assessment localStorage');
          localStorage.removeItem('assessmentProgress');
          localStorage.removeItem('completedCategories');
          // Keep user and assessmentData for history
        }

        // Store current server start time
        localStorage.setItem('serverStartTime', serverStartTime.toString());
      } catch (error) {
        console.error('Error checking server start time:', error);
        // Continue anyway - don't block the app
      }
    };

    checkServerRestart();
    getBandData();
    // Also load history on initial load
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // Call history API after a short delay to ensure user is set
      setTimeout(() => {
        getAssessmentHistory();
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (user && currentBand) {
      getAssessmentHistory();
    }
  }, [user, currentBand]);

  // Watch for completion of all competencies
  // useEffect(() => {
  //   if (Object.keys(competencyProgress).length === 0) return;

  //   const allCompleted = COMPETENCIES.every((comp) => {
  //     const compProgress = competencyProgress[comp.id] || 0;
  //     return compProgress === 25;
  //   });
  // }, [competencyProgress, assessmentStatus, currentBand]);

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    setUser(JSON.parse(userData));

    // Load assessment data from localStorage
    const assessmentData = localStorage.getItem("assessmentData");
    console.log("assesmentData", assessmentData)
    // if (assessmentData) {
    //   const data = JSON.parse(assessmentData);
    //   setAssessmentStatus(data.status || "Not Taken");
    // if (data.completedDate) {
    //   setCompletedDate(new Date(data.completedDate));
    // }
    // }

    // Check if there's an in-progress assessment
    const progress = localStorage.getItem("assessmentProgress");
    console.log("progress", progress)
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

    // Check if all competencies are completed (full assessment completed)
    // const allCompleted = COMPETENCIES.every((comp) => {
    //   const compProgress = progressMap[comp.id] || 0;
    //   return compProgress === 25;
    // });

    // if (allCompleted && COMPETENCIES.length > 0) {
    //   // Check if we have a stored completion date
    //   const storedCompletedDate = localStorage.getItem(
    //     "assessmentCompletedDate"
    //   );
    //   if (storedCompletedDate) {
    //     setCompletedDate(new Date(storedCompletedDate));
    //     setAssessmentStatus("completed");
    //   } else {
    //     // Mark as completed and store date
    //     const now = new Date();
    //     setCompletedDate(now);
    //     setAssessmentStatus("completed");
    //     localStorage.setItem("assessmentCompletedDate", now.toISOString());
    //     const currentBandData = currentBand || "2A";
    //     localStorage.setItem(
    //       "assessmentData",
    //       JSON.stringify({
    //         currentBand: currentBandData,
    //         status: "completed",
    //         completedDate: now.toISOString(),
    //       })
    //     );
    //   }
    // }

    // Load assessment history
    // const history = localStorage.getItem("assessmentHistory");
    // if (history) {
    //   setAssessmentHistory(JSON.parse(history));
    // }

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

  const handleCompetencyClick = (competency) => {
    // Check if assessment is completed and on cooldown - lock all sections
    if (isAssessmentOnCooldown()) {
      const daysLeft = getDaysUntilNextAssessment();
      setToastMessage(
        `There are still ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to retake the assessment. You completed this assessment on ${completedDate ? completedDate.toLocaleDateString() : 'N/A'}.`
      );
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 6000);
      return;
    }

    // Check if the competency is unlocked
    if (!isUnlocked(competency)) {
      // Check if it's locked due to previous section not being completed
      const previousCompetency = COMPETENCIES.find(
        (c) => c.order === competency.order - 1
      );
      if (previousCompetency && !isCompleted(previousCompetency.id)) {
        setToastMessage(
          `Please complete ${previousCompetency.name || 'the previous section'} first.`
        );
      } else {
        setToastMessage(
          `This section is locked. Please complete the previous sections first.`
        );
      }
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return;
    }

    // Set the category index based on competency order (0-indexed)
    const categoryIndex = competency.order - 1;
    navigate(`/assessment?category=${categoryIndex}`, { state: questionsData });
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
    // If assessment is completed and on cooldown, lock all sections
    if (isAssessmentOnCooldown()) {
      return false;
    }

    // First card (order 1) is always unlocked (if not on cooldown)
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
      // Check if 45 days have passed since completion
      return getDaysUntilNextAssessment() === 0;
    }
    return true;
  };

  // Check if assessment is completed and on cooldown
  const isAssessmentOnCooldown = () => {
    if (assessmentStatus === "completed" && completedDate) {
      return getDaysUntilNextAssessment() > 0;
    }
    return false;
  };

  return (
    <div className="dashboard-container">
      <Container className="py-4">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="d-flex align-items-center">
            <div>
              <h1 className="dashboard-title">Employee Dashboard</h1>
              <p className="dashboard-subtitle">Welcome back, {userName}</p>
            </div>
          </div>
          <div className="d-flex align-items-center">
            <div className="band-badge">{currentBand}</div>
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
                      {getDaysUntilNextAssessment()} day{getDaysUntilNextAssessment() !== 1 ? 's' : ''}
                    </p>
                    {completedDate && (
                      <>
                        <p
                          className="mb-0 mt-1"
                          style={{
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          {/* Completed on {completedDate.toLocaleDateString()} */}
                        </p>
                        <p className="mb-0 mt-1"
                          style={{
                            fontSize: "12px",
                            color: "#666",
                          }}>
                          Next Assessment on {dateFns.addDays(completedDate, 45).toLocaleDateString()}
                        </p>
                      </>
                    )}
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
                const onCooldown = isAssessmentOnCooldown();
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
                    className={`card-base competency-card ${!unlocked ? "competency-locked" : ""
                      }`}
                    onClick={() => handleCompetencyClick(competency)}
                    style={{
                      cursor: unlocked ? "pointer" : "not-allowed",
                      opacity: !unlocked ? 0.6 : 1,
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
                        {questionsData[competency.id]?.length || competency.questions || 0} questions
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

        {/* Band Assessment Section */}
        {/* <Card className="card-base mb-4">
          <Card.Body>
            <h5 className="history-title mb-4">Band Assessment</h5>
            
            <div className="d-flex align-items-center justify-content-between p-4 border rounded" style={{ 
              backgroundColor: "#f9f9f9",
              transition: "background-color 0.2s"
            }}>
              <div className="flex-grow-1">
                <h6 className="mb-1" style={{ fontWeight: 500, color: "#333" }}>
                  Band {currentBand || "2A"} Assessment
                </h6>
                <p className="mb-0 text-muted" style={{ fontSize: "14px" }}>
                  Complete all 5 categories with 25 questions each
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  if (!canTakeAssessment() && assessmentStatus === "completed") {
                    setToastMessage(`Assessment available in ${getDaysUntilNextAssessment()} days`);
                    setShowToast(true);
                    setTimeout(() => {
                      setShowToast(false);
                    }, 3000);
                  } else {
                    // Navigate to first competency if unlocked
                    const firstCompetency = COMPETENCIES[0];
                    if (isUnlocked(firstCompetency)) {
                      navigate(`/assessment?category=0`, { state: questionsData });
                    }
                  }
                }}
                disabled={!canTakeAssessment() && assessmentStatus === "completed"}
                style={{ 
                  minWidth: "180px",
                  whiteSpace: "nowrap"
                }}
              >
                {!canTakeAssessment() && assessmentStatus === "completed" 
                  ? `Available in ${getDaysUntilNextAssessment()} days`
                  : "Start Assessment"}
              </Button>
            </div>
          </Card.Body>
        </Card> */}

        {/* Assessment History Card */}
        <Card className="card-base history-card">
          <Card.Body>
            <h5 className="history-title">Assessment History</h5>
            {assessmentHistory.length === 0 ? (
              <p className="history-empty">No completed assessments yet</p>
            ) : (
              <div className="history-list">
                {assessmentHistory.map((assessment, index) => {
                  const isExpanded = expandedHistory[index];
                  const hasSections = assessment.sections && assessment.sections.length > 0;

                  return (
                    <div key={index} className="rounded border border-muted p-4 shadow-md flex flex-col w-full" >
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div style={{ flex: 1 }}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <strong style={{ fontSize: '18px', color: '#333' }}>
                                Band {assessment.band} Assessment
                              </strong>
                              {assessment.status === "Completed" && (
                                <span className="badge bg-success" style={{ fontSize: '12px' }}>
                                  Completed
                                </span>
                              )}
                              {assessment.status === "In Progress" && (
                                <span className="badge bg-warning text-dark" style={{ fontSize: '12px' }}>
                                  In Progress
                                </span>
                              )}
                            </div>
                            {assessment.status === "Completed" && assessment.completed_at && (
                              <p className="mb-1 text-muted" style={{ fontSize: '14px' }}>
                                <Clock size={14} style={{ marginRight: '4px', display: 'inline' }} />
                                Completed on{" "}
                                {new Date(assessment.completed_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                            {assessment.status === "Completed" && assessment.completed_at && (
                              <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                                <Clock size={14} style={{ marginRight: '4px', display: 'inline' }} />
                                Next Assessment On:{" "}
                                {(() => {
                                  const completedDate = new Date(assessment.completed_at);
                                  const nextDate = new Date(completedDate);
                                  nextDate.setDate(nextDate.getDate() + 45);
                                  return nextDate.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  });
                                })()}
                              </p>
                            )}
                            {assessment.status === "In Progress" && (
                              <p className="mb-0 text-muted" style={{ fontSize: '14px' }}>
                                Assessment in progress
                              </p>
                            )}
                          </div>
                          <div className="text-end" style={{ minWidth: '120px' }}>
                            {assessment.status === "Completed" && (
                              <div>
                                <div className="score" style={{
                                  fontSize: '28px',
                                  fontWeight: 700,
                                  color: '#4a90e2',
                                  lineHeight: '1.2'
                                }}>
                                  {assessment.total_score?.toFixed(1) || 0}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                  Overall Score
                                </div>
                              </div>
                            )}
                            {assessment.status === "In Progress" && (
                              <div className="status" style={{ color: "#ff9800", fontWeight: 600 }}>
                                In Progress
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section-wise Scores - Below Overall Score */}
                      {assessment.status === "Completed" && assessment.category_scores && assessment.category_scores.length > 0 && (
                        <div className="mt-3" style={{
                          borderTop: '1px solid #e0e0e0',
                          paddingTop: '15px'
                        }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 style={{
                              margin: 0,
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#333'
                            }}>
                              Section-wise Scores
                            </h6>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => setExpandedScores(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              style={{
                                padding: 0,
                                textDecoration: 'none',
                                color: '#4a90e2',
                                fontWeight: 500,
                                fontSize: '13px'
                              }}
                            >
                              {expandedScores[index] ? '▼ Hide' : '▶ Show'} Scores
                            </Button>
                          </div>

                          {expandedScores[index] && (
                            <div className="mt-2">
                              {assessment.category_scores.map((categoryScore, catIndex) => {
                                const score = typeof categoryScore === 'object'
                                  ? categoryScore.score
                                  : categoryScore;
                                const categoryName = typeof categoryScore === 'object'
                                  ? categoryScore.category
                                  : `Category ${catIndex + 1}`;

                                return (
                                  <div key={catIndex} style={{
                                    marginBottom: '12px',
                                    padding: '12px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px',
                                    border: '1px solid #e0e0e0'
                                  }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                      <span style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#333',
                                        flex: 1
                                      }}>
                                        {categoryName}
                                      </span>
                                      <span style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: score >= 75 ? '#28a745' : score >= 50 ? '#ffc107' : '#dc3545',
                                        minWidth: '50px',
                                        textAlign: 'right'
                                      }}>
                                        {parseFloat(score).toFixed(1)}%
                                      </span>
                                    </div>
                                    <ProgressBar
                                      now={parseFloat(score)}
                                      style={{ height: '8px' }}
                                      variant={
                                        score >= 75 ? 'success' :
                                          score >= 50 ? 'warning' :
                                            'danger'
                                      }
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable Questions and Answers Section */}
                      {hasSections && (
                        <div className="mt-3" style={{
                          borderTop: '1px solid #e0e0e0',
                          paddingTop: '15px',

                        }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}>

                            <h6 className="font-semibold text-xl m-0">Assessment Review</h6>
                            <Button
                              variant="link"
                              onClick={() => setExpandedHistory(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              style={{
                                padding: 0,
                                textDecoration: 'none',
                                color: '#4a90e2',
                                fontWeight: 500,
                                fontSize: "13px",
                              }}
                            >
                              {isExpanded ? '▼ Hide Questions & Answers' : '▶ View Questions & Answers'}
                            </Button>
                          </div>



                          {isExpanded && (
                            <div className="mt-3" style={{
                              backgroundColor: '#f9f9f9',
                              padding: '15px',
                              borderRadius: '8px',
                              maxHeight: '600px',
                              overflowY: 'auto'
                            }}>
                              {assessment.sections.map((section, sectionIndex) => {
                                // Find matching category score
                                const categoryScore = assessment.category_scores?.find(
                                  cs => {
                                    const catName = typeof cs === 'object' ? cs.category : null;
                                    return catName === section.category ||
                                      section.category.includes(catName) ||
                                      catName?.includes(section.category);
                                  }
                                );
                                const sectionScore = categoryScore
                                  ? (typeof categoryScore === 'object' ? categoryScore.score : categoryScore)
                                  : null;

                                return (
                                  <div key={sectionIndex} className="mb-4" style={{
                                    borderBottom: sectionIndex < assessment.sections.length - 1 ? '2px solid #e0e0e0' : 'none',
                                    paddingBottom: sectionIndex < assessment.sections.length - 1 ? '15px' : '0'
                                  }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                      <h6 style={{
                                        color: '#333',
                                        margin: 0,
                                        fontWeight: 600,
                                        fontSize: '16px'
                                      }}>
                                        {section.category}
                                      </h6>
                                      {sectionScore !== null && (
                                        <div style={{
                                          padding: '6px 12px',
                                          backgroundColor: sectionScore >= 75 ? '#d4edda' :
                                            sectionScore >= 50 ? '#fff3cd' : '#f8d7da',
                                          borderRadius: '20px',
                                          border: `1px solid ${sectionScore >= 75 ? '#c3e6cb' :
                                            sectionScore >= 50 ? '#ffeaa7' : '#f5c6cb'}`
                                        }}>
                                          <span style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: sectionScore >= 75 ? '#155724' :
                                              sectionScore >= 50 ? '#856404' : '#721c24'
                                          }}>
                                            {parseFloat(sectionScore).toFixed(1)}%
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {section.questions && section.questions.map((qa, qaIndex) => (
                                      <div key={qaIndex} className="mb-3" style={{
                                        padding: '10px',
                                        backgroundColor: 'white',
                                        borderRadius: '4px',
                                        marginBottom: '8px'
                                      }}>
                                        <div style={{ fontWeight: 500, marginBottom: '5px', color: '#555' }}>
                                          Q{qaIndex + 1}: {qa.question}
                                        </div>
                                        <div style={{
                                          color: '#4a90e2',
                                          fontWeight: 600,
                                          fontSize: '14px'
                                        }}>
                                          Answer: {
                                            qa.answer_value === '5' ? 'Always' :
                                              qa.answer_value === '4' ? 'Often' :
                                                qa.answer_value === '3' ? 'Sometimes' :
                                                  qa.answer_value === '2' ? 'Rarely' :
                                                    qa.answer_value === '1' ? 'Not yet' :
                                                      qa.answer_value
                                          } ({qa.answer_value})
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
