import React, { useState, useEffect } from "react";
import { useNavigate} from "react-router-dom";
import { Container, Card, Button, ProgressBar } from "react-bootstrap";
import {
  ArrowBack,
  ArrowForward,
  AccessTime,
  ChatBubbleOutline,
  Refresh,
  Group,
  // PersonCheck,
  Psychology,
  Lock,
} from "@mui/icons-material";
import axios from 'axios';
import "../styles.css";
import "./Dashboard.css";

const COMPETENCIES = [
  {
    id: "Communication",
    name: "COMMUNICATION",
    color: "blue",
    icon: ChatBubbleOutline,
    questions: 25,
    order: 1,
  },
  {
    id: "Adaptability & Learning Agility",
    name: "ADAPTABILITY & LEARNING AGILITY",
    color: "orange",
    icon: Refresh,
    questions: 25,
    order: 2,
  },
  {
    id: "Teamwork & Collaboration",
    name: "TEAMWORK & COLLABORATION",
    color: "green",
    icon: Group,
    questions: 25,
    order: 3,
  },
  {
    id: "Accountability & Ownership",
    name: "ACCOUNTABILITY & OWNERSHIP",
    color: "brown",
    icon: Group,
    questions: 25,
    order: 4,
  },
  {
    id: "Problem Solving & Critical Thinking",
    name: "PROBLEM SOLVING & CRITICAL THINKING",
    color: "purple",
    icon: Psychology,
    questions: 25,
    order: 5,
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [currentBand, setCurrentBand] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState("Not Taken");
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [questionsData, setQuestionsData] = useState({});
  const [competencyProgress, setCompetencyProgress] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const getQuestions = (band, category) => {
    axios.get(`http://localhost:8000/bands/band${band}/category/${category}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }).then((response) => {
      console.log(response.data);
      // const data = response.data.questions;

      // Map raw category text to competency IDs
      // const categoryToCompetency = {
      //   "Self evaluation Communication": "Communication",
      //   "Self evaluation Adaptability & Learning Agility": "Adaptability & Learning Agility",
      //   "Self-evaluation Teamwork & Collaboration": "Teamwork & Collaboration",
      //   "Self evaluation Accountability & Ownership": "Accountability & Ownership",
      //   "Self evaluation Problem Solving & Critical Thinking": "Problem Solving & Critical Thinking",
      // };

      // const grouped = data.reduce((acc, item) => {
      //   // Convert category name → correct competency id
      //   const compId = categoryToCompetency[item.category];

      //   if (!compId) return acc; // skip if no match

      //   if (!acc[compId]) acc[compId] = [];
      //   acc[compId].push(item.question);

      //   return acc;
      // }, {});

      // console.log(grouped);
      // setQuestionsData(grouped);


    }).catch((error) => {
      console.error('There was an error fetching the questions!', error);
    });
  }

  const getBandData = () => {
    axios.get('http://localhost:8000/employeeData/SS003', {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }).then((response) => {
      console.log(response.data);
      setUserName(response.data.Employee_Name);
      setCurrentBand(response.data.Agreed_Band);
    }).catch((error) => {
      console.error('There was an error fetching the band data!', error);
    });
  }

  useEffect(() => {
    getBandData();
  }, []);

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
    if (assessmentData) {
      const data = JSON.parse(assessmentData);
      setCurrentBand(data.currentBand || "2A");
      setAssessmentStatus(data.status || "Not Taken");
    }

    // Check if there's an in-progress assessment
    const progress = localStorage.getItem("assessmentProgress");
    if (progress) {
      setAssessmentStatus("In Progress");
      // Calculate competency progress
      const progressData = JSON.parse(progress);
      const answers = progressData.answers || {};
      const progressMap = {};

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
      setCompetencyProgress(progressMap);
    }

    // Load completed competencies
    const completed = localStorage.getItem("completedCompetencies");
    if (completed) {
      const completedMap = JSON.parse(completed);
      // Convert category-{index} keys to competency IDs
      const progressMap = {};
      COMPETENCIES.forEach((comp, index) => {
        const key = `category-${index}`;
        if (completedMap[key]) {
          progressMap[comp.id] = completedMap[key];
        }
      });
      setCompetencyProgress((prev) => ({ ...prev, ...progressMap }));
    }

    // Load assessment history
    const history = localStorage.getItem("assessmentHistory");
    if (history) {
      setAssessmentHistory(JSON.parse(history));
    }

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
    // Set the category index based on competency order (0-indexed)
    const categoryIndex = competency.order - 1;
    navigate(`/assessment?category=${categoryIndex}`, { state: questionsData }); // Replaced history.push with navigate
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

  const isCompleted = (competencyId) => {
    const progress = competencyProgress[competencyId] || 0;
    return progress === 25;
  };

  return (
    <div className="dashboard-container">
      <Container className="py-4">
        {/* Header */}
        <div className="dashboard-header mb-4">
          <div className="d-flex align-items-center">
            <ArrowBack
              className="header-icon"
              onClick={() => window.history.back()}
              style={{ cursor: "pointer", marginRight: "16px" }}
            />
            <div>
              <h1 className="dashboard-title">Employee Dashboard</h1>
              <p className="dashboard-subtitle">
                Welcome back, {userName}
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center">
            <div className="band-badge">{currentBand}</div>
            <ArrowForward
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
                  <AccessTime className="info-icon blue-icon" />
                </div>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-6 mb-3">
            <Card className="card-base info-card">
              <Card.Body>
                <h6 className="card-label">Band Assessment Status</h6>
                <div className="d-flex align-items-center justify-content-between">
                  <p className="card-value">{assessmentStatus}</p>
                  <AccessTime className="info-icon orange-icon" />
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

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
                const IconComponent = competency.icon;
                const progress = getProgressPercentage(competency.id);
                const completed = isCompleted(competency.id);

                return (
                  <Card
                    key={competency.id}
                    className={`card-base competency-card competency-${competency.color}`}
                    onClick={() => handleCompetencyClick(competency)}
                  >
                    <Card.Body className="competency-card-body">
                      <div className="competency-icon-wrapper">
                        <IconComponent className="competency-icon" />
                        {!completed && <Lock className="competency-lock" />}
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

                      <div className={`badge-number competency-${competency.color}-badge`}>
                        {competency.order}
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}

            </div>

            <div className="text-center mt-4">
              <p className="sails-brand">SAILS</p>
              <p className="sails-subtitle">Software</p>
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
                        className={`status ${assessment.passed ? "passed" : "failed"
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
