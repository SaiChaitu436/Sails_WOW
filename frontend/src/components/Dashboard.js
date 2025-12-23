import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Button, ProgressBar, Modal } from "react-bootstrap";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import axios from "axios";
import Assessment from "./Assessment";
import DashboardHeader from "./DashboardHeader";
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
  const [employeeData, setEmployeeData] = useState(null); // Store employee data from API
  const [assessmentStatus, setAssessmentStatus] = useState("Not Taken");
  const [completedDate, setCompletedDate] = useState(null);
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [questionsData, setQuestionsData] = useState({});
  const [competencyProgress, setCompetencyProgress] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [expandedHistory, setExpandedHistory] = useState({});
  const [expandedScores, setExpandedScores] = useState({});
  const [scoreEvaluations, setScoreEvaluations] = useState({}); // Store evaluations by assessment index and category
  const [loadingEvaluations, setLoadingEvaluations] = useState({}); // Track loading state
  const [scoreRanges, setScoreRanges] = useState({}); // Store score ranges by band
  const [loadingScoreRanges, setLoadingScoreRanges] = useState({}); // Track loading state for score ranges
  const [showScoreRangesModal, setShowScoreRangesModal] = useState(false); // Modal visibility
  const [modalBand, setModalBand] = useState(null); // Band for which to show score ranges
  const [modalCategory, setModalCategory] = useState(null); // Category to filter and highlight
  const [modalScore, setModalScore] = useState(null); // User's score to highlight matching row
  const [modalAssessmentIndex, setModalAssessmentIndex] = useState(null); // Assessment index for scrolling
  const [showAssessmentModal, setShowAssessmentModal] = useState(false); // Assessment modal visibility
  const [assessmentCategoryIndex, setAssessmentCategoryIndex] = useState(0); // Category index for assessment
  const [filteredCategoryByAssessment, setFilteredCategoryByAssessment] = useState({}); // Track filtered category per assessment
  const [sectionScoresHeights, setSectionScoresHeights] = useState({}); // Track heights of section-wise scores per assessment
  const scoresRefs = useRef({}); // Refs for section-wise scores containers

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
    // Only use fallback pattern for employeeData API call
    const employeeId = parsedUser.id || parsedUser.employeeId || parsedUser.employee_id || 'SS003';

    axios
      .get(`http://localhost:8000/employeeData/${employeeId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      .then((response) => {
        // Store full employee data in state
        setEmployeeData(response.data);
        
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
    if (!employeeData) return;

    const employeeId = employeeData.Employee_Number;

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

  // Fetch score evaluations for all categories in an assessment
  const fetchScoreEvaluations = async (assessmentIndex, assessment) => {
    if (!employeeData) return;

    const employeeId = employeeData.Employee_Number;

    if (!assessment.category_scores || assessment.category_scores.length === 0) {
      return;
    }

    // Fetch evaluation for each category
    const evaluationPromises = assessment.category_scores.map(async (categoryScore) => {
      const categoryName = typeof categoryScore === 'object'
        ? categoryScore.category
        : categoryScore;
      const evaluationKey = `${assessmentIndex}-${categoryName}`;

      // Skip if already loaded
      if (scoreEvaluations[evaluationKey]) {
        return;
      }

      // Set loading state
      setLoadingEvaluations(prev => ({
        ...prev,
        [evaluationKey]: true
      }));

      try {
        const response = await axios.post(
          'http://localhost:8000/assessment/score-evaluation',
          {
            band: assessment.band,
            category: categoryName,
            employee_id: employeeId
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            }
          }
        );

        // Store evaluation
        setScoreEvaluations(prev => ({
          ...prev,
          [evaluationKey]: response.data
        }));
      } catch (error) {
        console.error(`Error fetching evaluation for ${categoryName}:`, error);
        // Store error state (optional - you can show error message if needed)
        setScoreEvaluations(prev => ({
          ...prev,
          [evaluationKey]: { error: 'Failed to load evaluation' }
        }));
      } finally {
        // Clear loading state
        setLoadingEvaluations(prev => {
          const newState = { ...prev };
          delete newState[evaluationKey];
          return newState;
        });
      }
    });

    // Wait for all evaluations to complete
    await Promise.all(evaluationPromises);
  };

  // Fetch score ranges table for a band
  const fetchScoreRanges = async (band) => {
    // Skip if already loaded
    if (scoreRanges[band]) {
      return;
    }

    // Set loading state
    setLoadingScoreRanges(prev => ({
      ...prev,
      [band]: true
    }));

    try {
      const response = await axios.get(
        `http://localhost:8000/assessment/score-ranges/${band}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      // Store score ranges
      setScoreRanges(prev => ({
        ...prev,
        [band]: response.data.score_ranges
      }));
    } catch (error) {
      console.error(`Error fetching score ranges for band ${band}:`, error);
      setScoreRanges(prev => ({
        ...prev,
        [band]: { error: 'Failed to load score ranges' }
      }));
    } finally {
      // Clear loading state
      setLoadingScoreRanges(prev => {
        const newState = { ...prev };
        delete newState[band];
        return newState;
      });
    }
  };

  // Handle opening score ranges modal
  const handleOpenScoreRangesModal = (band, category, score, assessmentIndex) => {
    setModalBand(band);
    setModalCategory(category);
    setModalScore(score);
    setModalAssessmentIndex(assessmentIndex);
    setShowScoreRangesModal(true);
    // Fetch score ranges if not already loaded
    if (!scoreRanges[band]) {
      fetchScoreRanges(band);
    }
  };

  // Handle closing score ranges modal and scroll to assessment
  const handleCloseScoreRangesModal = () => {
    setShowScoreRangesModal(false);
    setModalBand(null);
    setModalCategory(null);
    setModalScore(null);
    setModalAssessmentIndex(null);
  };

  // Handle review answers button - scroll to assessment section and expand it
  const handleReviewAnswers = () => {
    setShowScoreRangesModal(false);
    if (modalAssessmentIndex !== null && modalCategory) {
      // Set filter to show only the selected category
      setFilteredCategoryByAssessment(prev => ({
        ...prev,
        [modalAssessmentIndex]: modalCategory
      }));
      
      // Expand the Assessment Review section
      setExpandedHistory(prev => ({
        ...prev,
        [modalAssessmentIndex]: true
      }));
      
      // Wait a bit for the expansion, then scroll
      setTimeout(() => {
        const elementId = `assessment-${modalAssessmentIndex}`;
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Scroll to the specific category section within Assessment Review
          setTimeout(() => {
            const categorySectionId = `category-${modalAssessmentIndex}-${modalCategory}`;
            const categoryElement = document.getElementById(categorySectionId);
            if (categoryElement) {
              // categoryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the category section briefly
              categoryElement.style.transition = 'box-shadow 0.3s ease, background-color 0.3s ease';
              categoryElement.style.boxShadow = '0 0 20px rgba(74, 144, 226, 0.5)';
              categoryElement.style.backgroundColor = '#e3f2fd';
              setTimeout(() => {
                categoryElement.style.boxShadow = '';
                categoryElement.style.backgroundColor = '';
              }, 3000);
            }
          }, 500);
        }
      }, 100);
    }
    setModalBand(null);
    setModalCategory(null);
    setModalScore(null);
    setModalAssessmentIndex(null);
  };

  // Parse score range string to get min and max values
  const parseScoreRange = (rangeStr) => {
    if (!rangeStr) return { min: 0, max: 0 };
    
    const text = rangeStr.toLowerCase().trim();
    
    // Handle "below X" or "< X" format
    if (text.includes("below") || text.startsWith("<")) {
      const num = parseInt(text.match(/\d+/)?.[0] || "0");
      return { min: 0, max: num - 1 };
    }
    
    // Handle "X-Y" format
    const nums = text.match(/\d+/g);
    if (nums && nums.length === 2) {
      return { min: parseInt(nums[0]), max: parseInt(nums[1]) };
    }
    
    // Handle single number (exact match)
    if (nums && nums.length === 1) {
      const num = parseInt(nums[0]);
      return { min: num, max: num };
    }
    
    return { min: 0, max: 0 };
  };

  // Check if score falls within a range
  const isScoreInRange = (score, rangeStr) => {
    const { min, max } = parseScoreRange(rangeStr);
    return score >= min && score <= max;
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

  // Recalculate section scores heights when expandedScores or scoreEvaluations change
  useEffect(() => {
    // Check all assessment indices
    assessmentHistory.forEach((assessment, index) => {
      if (expandedScores[index]) {
        const ref = scoresRefs.current[`scores-${index}`];
        if (ref) {
          setTimeout(() => {
            const height = ref.offsetHeight;
            setSectionScoresHeights(prev => ({
              ...prev,
              [index]: height
            }));
          }, 100);
        }
      } else {
        // Clear height when collapsed
        setSectionScoresHeights(prev => {
          const newState = { ...prev };
          delete newState[index];
          return newState;
        });
      }
    });
  }, [expandedScores, scoreEvaluations, assessmentHistory]);

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
    setAssessmentCategoryIndex(categoryIndex);
    setShowAssessmentModal(true);
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
      <DashboardHeader />
      <Container className="">
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

        {/* Assessment History Card */}
        <Card className="card-base history-card">
          <Card.Body>
            <h5 className="history-title">Assessment History</h5>
            {assessmentHistory.length === 0 ? (
              <p className="history-empty">No completed assessments yet</p>
            ) : (
              <div className="history-list" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
                gap: '20px',
                width: '100%'
              }}>
                {assessmentHistory.map((assessment, index) => {
                  const isExpanded = expandedHistory[index];
                  const hasSections = assessment.sections && assessment.sections.length > 0;

                  // Determine card color based on status
                  let cardBorderColor = '#e0e0e0';
                  let cardBgColor = '#ffffff';
                  if (assessment.status === "Completed") {
                    cardBorderColor = '#28a745';
                    cardBgColor = '#f8fff9';
                  } else if (assessment.status === "In Progress") {
                    cardBorderColor = '#ffc107';
                    cardBgColor = '#fffef8';
                  }

                  return (
                    <div 
                      key={index} 
                      id={`assessment-${index}`}
                      className="rounded border p-4 shadow-md flex flex-col w-full" 
                      style={{
                        borderColor: cardBorderColor,
                        backgroundColor: cardBgColor,
                        borderWidth: '2px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div className="mb-3">
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-2">
                          <div style={{ flex: 1, width: '100%' }}>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              <strong style={{ fontSize: '18px', color: '#333', wordBreak: 'break-word' }}>
                                Band {assessment.band} Assessment
                              </strong>
                              {assessment.status === "Completed" && (
                                <span className="badge bg-success" style={{ fontSize: '12px', flexShrink: 0 }}>
                                  Completed
                                </span>
                              )}
                              {assessment.status === "In Progress" && (
                                <span className="badge bg-warning text-dark" style={{ fontSize: '12px', flexShrink: 0 }}>
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
                          <div className="text-end" style={{ minWidth: '150px' }}>
                            {assessment.status === "Completed" && (
                              <div>
                                <div className="score" style={{
                                  fontSize: '32px',
                                  fontWeight: 700,
                                  color: '#4a90e2',
                                  lineHeight: '1.2'
                                }}>
                                  {assessment.total_score?.toFixed(1) || 0}%
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '4px' }}>
                                  Overall Percentage
                                </div>
                                {(() => {
                                  // Calculate total points (5 competencies * 25 questions * 5 max points = 625 max)
                                  let totalPoints = 0;
                                  let maxTotalPoints = 0;
                                  if (assessment.category_scores) {
                                    assessment.category_scores.forEach(catScore => {
                                      const catScoreValue = typeof catScore === 'object' ? catScore.score : catScore;
                                      const questionsPerCategory = 25;
                                      const maxPointsPerCategory = questionsPerCategory * 5;
                                      const actualPoints = Math.round((catScoreValue / 100) * maxPointsPerCategory);
                                      totalPoints += actualPoints;
                                      maxTotalPoints += maxPointsPerCategory;
                                    });
                                  }
                                  return (
                                    <div style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>
                                      Total Marks: {totalPoints}/{maxTotalPoints}
                                    </div>
                                  );
                                })()}
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

                      <div className="d-flex gap-3">
                      {/* Section-wise Scores - Below Overall Score */}
                      {assessment.status === "Completed" && assessment.category_scores && assessment.category_scores.length > 0 && (
                        <div className="mt-3" style={{
                          borderTop: '1px solid #e0e0e0',
                          paddingTop: '15px'
                        }}>
                          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-2 gap-2">
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
                              onClick={() => {
                                const isExpanding = !expandedScores[index];
                                setExpandedScores(prev => ({
                                  ...prev,
                                  [index]: isExpanding
                                }));
                                
                                // Fetch evaluations when expanding
                                if (isExpanding && assessment.status === "Completed" && assessment.category_scores) {
                                  fetchScoreEvaluations(index, assessment);
                                }
                              }}
                              className="text-nowrap"
                              style={{
                                padding: 0,
                                textDecoration: 'none',
                                color: '#4a90e2',
                                fontWeight: 500,
                                fontSize: '13px',
                                flexShrink: 0
                              }}
                            >
                              {expandedScores[index] ? '▼ Hide' : '▶ Show'} Scores
                            </Button>
                          </div>

                          {expandedScores[index] && (
                            <div 
                              ref={el => {
                                if (el) {
                                  scoresRefs.current[`scores-${index}`] = el;
                                  // Measure height after render
                                  setTimeout(() => {
                                    const height = el.offsetHeight;
                                    setSectionScoresHeights(prev => ({
                                      ...prev,
                                      [index]: height
                                    }));
                                  }, 50);
                                }
                              }}
                              className="mt-2"
                            >
                              {assessment.category_scores.map((categoryScore, catIndex) => {
                                const score = typeof categoryScore === 'object'
                                  ? categoryScore.score
                                  : categoryScore;
                                const categoryName = typeof categoryScore === 'object'
                                  ? categoryScore.category
                                  : `Category ${catIndex + 1}`;
                                
                                // Get evaluation for this category
                                const evaluationKey = `${index}-${categoryName}`;
                                const evaluation = scoreEvaluations[evaluationKey];
                                const isLoading = loadingEvaluations[evaluationKey];

                                // Calculate points (assuming 25 questions per category, max 5 points each = 125 max)
                                const questionsCount = 25; // Standard questions per category
                                const maxPoints = questionsCount * 5; // 125 points max
                                const actualPoints = Math.round((score / 100) * maxPoints);

                                // Determine status based on score
                                let statusBadge = null;
                                let statusColor = '#666';
                                if (score >= 75) {
                                  statusBadge = 'Excellent';
                                  statusColor = '#28a745';
                                } else if (score >= 50) {
                                  statusBadge = 'Needs Improvement';
                                  statusColor = '#ffc107';
                                } else {
                                  statusBadge = 'Critical';
                                  statusColor = '#dc3545';
                                }

                                return (
                                  <div key={catIndex} style={{
                                    marginBottom: '16px',
                                    padding: '16px',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid #e0e0e0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}
                                  >
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start">
                                      <div style={{ flex: 1, width: '100%' }}>
                                        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 justify-content-between mb-2">
                                          <span style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: '#333',
                                            // wordBreak: 'break-word'
                                          }}>
                                            {categoryName}
                                          </span>
                                          <Button
                                            variant="link"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenScoreRangesModal(assessment.band, categoryName, score, index);
                                            }}
                                            className="text-nowrap"
                                            style={{
                                              padding: '2px 8px',
                                              fontSize: '12px',
                                              color: '#4a90e2',
                                              textDecoration: 'none',
                                              whiteSpace: 'nowrap',
                                              flexShrink: 0
                                            }}
                                          >
                                            View Interpretation & Range
                                          </Button>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                          <div style={{
                                            fontSize: '13px',
                                            color: '#666',
                                          }}>
                                            {actualPoints}/{maxPoints} Marks
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {/* <ProgressBar
                                      now={parseFloat(score)}
                                      style={{ height: '10px', borderRadius: '5px' }}
                                      variant={
                                        score >= 75 ? 'success' :
                                          score >= 50 ? 'warning' :
                                            'danger'
                                      }
                                    /> */}

                                    {isLoading && (
                                      <div className="mt-2" style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                        Loading evaluation...
                                      </div>
                                    )}
                                    {evaluation && evaluation.error && (
                                      <div className="mt-2" style={{ fontSize: '12px', color: '#dc3545', fontStyle: 'italic' }}>
                                        {evaluation.error}
                                      </div>
                                    )}
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
                          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                            <h6 className="font-semibold text-xl m-0" style={{ wordBreak: 'break-word' }}>Assessment Review</h6>
                            <Button
                              variant="link"
                              onClick={() => setExpandedHistory(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }))}
                              className="text-nowrap"
                              style={{
                                padding: 0,
                                textDecoration: 'none',
                                color: '#4a90e2',
                                fontWeight: 500,
                                fontSize: "13px",
                                flexShrink: 0
                              }}
                            >
                              {isExpanded ? '▼ Hide Questions & Answers' : '▶ View Questions & Answers'}
                            </Button>
                          </div>

                          {isExpanded && (
                            <div className="mt-2" style={{
                              backgroundColor: '#f9f9f9',
                              padding: '15px',
                              borderRadius: '8px',
                              maxHeight: assessment.status === "Completed" && sectionScoresHeights[index] ? `${sectionScoresHeights[index]}px` : '600px',
                              overflowY: 'auto'
                            }}>
                              {/* Filter indicator and clear button */}
                              {filteredCategoryByAssessment[index] && (
                                <div className="mb-3 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2" style={{
                                  padding: '10px',
                                  backgroundColor: '#e3f2fd',
                                  borderRadius: '6px',
                                  border: '1px solid #4a90e2'
                                }}>
                                  <span style={{ 
                                    fontSize: '14px', 
                                    color: '#333', 
                                    fontWeight: 500,
                                    wordBreak: 'break-word',
                                    flex: 1
                                  }}>
                                    <strong>{filteredCategoryByAssessment[index]}</strong>
                                  </span>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => {
                                      setFilteredCategoryByAssessment(prev => {
                                        const newState = { ...prev };
                                        delete newState[index];
                                        return newState;
                                      });
                                    }}
                                    className="text-nowrap"
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '12px',
                                      color: '#4a90e2',
                                      textDecoration: 'none',
                                      fontWeight: 500,
                                      flexShrink: 0
                                    }}
                                  >
                                    Show All Categories
                                  </Button>
                                </div>
                              )}
                              {(() => {
                                // Filter sections based on selected category
                                const filteredSections = assessment.sections.filter(section => {
                                  const filterCategory = filteredCategoryByAssessment[index];
                                  return !filterCategory || section.category === filterCategory;
                                });
                                
                                return filteredSections.map((section, sectionIndex) => {
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
                                    <div 
                                      key={sectionIndex} 
                                      id={`category-${index}-${section.category}`}
                                      className="mb-4" 
                                      style={{
                                        borderBottom: sectionIndex < filteredSections.length - 1 ? '2px solid #e0e0e0' : 'none',
                                        paddingBottom: sectionIndex < filteredSections.length - 1 ? '15px' : '0',
                                        transition: 'all 0.3s ease'
                                      }}
                                    >
                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
                                      <h6 style={{
                                        color: '#333',
                                        margin: 0,
                                        fontWeight: 600,
                                        fontSize: '16px',
                                        wordBreak: 'break-word',
                                        flex: 1
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
                                            sectionScore >= 50 ? '#ffeaa7' : '#f5c6cb'}`,
                                          flexShrink: 0
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
                                        marginBottom: '8px',
                                        wordBreak: 'break-word'
                                      }}>
                                        <div style={{ 
                                          fontWeight: 500, 
                                          marginBottom: '5px', 
                                          color: '#555',
                                          fontSize: '14px',
                                          lineHeight: '1.5'
                                        }}>
                                          Q{qaIndex + 1}: {qa.question}
                                        </div>
                                        <div style={{
                                          color: '#4a90e2',
                                          fontWeight: 600,
                                          fontSize: '14px',
                                          wordBreak: 'break-word'
                                        }}>
                                          Answer: {
                                            qa.answer_value === '5' ? 'Always' :
                                              qa.answer_value === '4' ? 'Often' :
                                                qa.answer_value === '3' ? 'Sometimes' :
                                                  qa.answer_value === '2' ? 'Rarely' :
                                                    qa.answer_value === '1' ? 'Not yet' :
                                                      qa.answer_value
                                          }
                                        </div>
                                      </div>
                                    ))}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Score Ranges Modal */}
      <Modal
        show={showScoreRangesModal}
        onHide={handleCloseScoreRangesModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
          {modalCategory} --Score Interpretation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '0' }}>
          {loadingScoreRanges[modalBand] ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading score ranges...
            </div>
          ) : scoreRanges[modalBand] && !scoreRanges[modalBand].error ? (
            <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#333',
                      borderRight: '1px solid #dee2e6',
                      backgroundColor: '#f8f9fa'
                    }}>
                      Score Interpretation
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#333',
                      borderRight: '1px solid #dee2e6',
                      backgroundColor: '#f8f9fa'
                    }}>
                      Interpretation
                    </th>
                    <th style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: '#333',
                      backgroundColor: '#f8f9fa'
                    }}>
                      Focus Area
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scoreRanges[modalBand]
                    .filter(range => range.category === modalCategory)
                    .map((range, rangeIndex) => {
                      const isHighlighted = modalScore !== null && isScoreInRange(parseFloat(modalScore), range.score_range);
                      return (
                        <tr key={rangeIndex} style={{
                          borderBottom: '1px solid #e0e0e0',
                          backgroundColor: isHighlighted 
                            ? '#fff3cd' 
                            : rangeIndex % 2 === 0 
                              ? '#ffffff' 
                              : '#f9f9f9',
                          borderLeft: isHighlighted ? '4px solid #ffc107' : 'none',
                          fontWeight: isHighlighted ? 600 : 'normal'
                        }}>
                          <td style={{
                            padding: '12px',
                            borderRight: '1px solid #e0e0e0',
                            color: isHighlighted ? '#856404' : '#666',
                            fontFamily: 'monospace',
                            fontWeight: isHighlighted ? 700 : 'normal'
                          }}>
                            {range.score_range}
                          </td>
                          <td style={{
                            padding: '12px',
                            borderRight: '1px solid #e0e0e0',
                            color: isHighlighted ? '#856404' : '#555',
                            maxWidth: '300px'
                          }}>
                            {range.interpretation}
                          </td>
                          <td style={{
                            padding: '12px',
                            color: isHighlighted ? '#856404' : '#555',
                            maxWidth: '300px'
                          }}>
                            {range.focus_area}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
              {scoreRanges[modalBand]?.error || 'Failed to load score ranges'}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="primary" 
            onClick={handleReviewAnswers}
            style={{
              backgroundColor: '#4a90e2',
              borderColor: '#4a90e2',
              color: 'white',
              fontWeight: 600,
              padding: '8px 20px'
            }}
          >
            Review Answers
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Assessment Modal */}
      <Assessment
        show={showAssessmentModal}
        onHide={() => setShowAssessmentModal(false)}
        categoryIndex={assessmentCategoryIndex}
        questionsData={questionsData}
        employeeData={employeeData}
      />

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
