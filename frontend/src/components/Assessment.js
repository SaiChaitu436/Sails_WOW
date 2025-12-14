import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Modal,
  Form,
  Button,
  ProgressBar,
  Container,
  Alert,
  Spinner,
} from "react-bootstrap";
import { ArrowLeft, CheckCircle2, Clock, LogOut, Lock } from "lucide-react";
import {
  Close,
  Check,
  ArrowBack,
  ArrowForward,
  AccessTime,
  Celebration,
} from "@mui/icons-material";
import axios from "axios";
import CongratulationsModal from "./CongratulationsModal";
import "../styles.css";
import "./Assessment.css";

const CATEGORIES = [
  "Communication",
  "Adaptability & Learning Agility",
  "Teamwork & Collaboration",
  "Accountability & Ownership",
  "Problem Solving & Critical Thinking",
];

const QUESTIONS_PER_CATEGORY = 25;

const ANSWER_OPTIONS = [
  {
    value: "5",
    label: "Always",
    description: "I do this confidently, every time",
  },
  {
    value: "4",
    label: "Often",
    description: "I usually do this without being reminded",
  },
  {
    value: "3",
    label: "Sometimes",
    description: "I try to do this when I remember",
  },
  {
    value: "2",
    label: "Rarely",
    description: "I'm still getting used to this",
  },
  { value: "1", label: "Not yet", description: "I haven't tried this before" },
];

const Assessment = ({ 
  show, 
  onHide, 
  categoryIndex: initialCategoryIndex = 0,
  questionsData: propsQuestionsData = {},
  apiData: propsApiData = null,
  currentBand: propsCurrentBand = "",
  employeeId: propsEmployeeId = "",
  onComplete
}) => {
  // Alias for easier reference
  const questionsData = propsQuestionsData;
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(initialCategoryIndex);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [user, setUser] = useState(null);
  const [currentBand, setCurrentBand] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [categoryQuestions, setCategoryQuestions] = useState([]);
  const initializedRef = useRef(false);

  // Check if category is completed and synced with API
  const isCategoryCompleted = useCallback((categoryIndex) => {
    const completedCategories =
      localStorage.getItem("completedCategories") || "{}";
    const completedMap = JSON.parse(completedCategories);
    const categoryKey = `category-${categoryIndex}`;
    return completedMap[categoryKey]?.apiSynced === true;
  }, []);

  // Load user and initial state
  useEffect(() => {
    if (!show) return; // Don't initialize if modal is not shown
    
    const categoryIndex = initialCategoryIndex;
    
    // Prevent re-initialization if already initialized for this category
    if (initializedRef.current === categoryIndex) {
      return;
    }

    const userData = localStorage.getItem("user");
    if (!userData) {
      onHide();
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Get currentBand and employeeId from props
    if (propsCurrentBand) {
      setCurrentBand(propsCurrentBand);
    } else {
      // Fallback to localStorage if not in props
      const assessmentData = localStorage.getItem("assessmentData");
      if (assessmentData) {
        const data = JSON.parse(assessmentData);
        setCurrentBand(data.currentBand);
      }
    }

    // Get employeeId from props
    if (propsEmployeeId) {
      setEmployeeId(propsEmployeeId);
    }

    // Set category index
    if (categoryIndex >= 0 && categoryIndex < CATEGORIES.length) {
      setCurrentCategoryIndex(categoryIndex);

      // Check if this category is already completed (review mode)
      if (isCategoryCompleted(categoryIndex)) {
        setIsReviewMode(true);
      }
    }

    // Load questions for current category
    const categoryName = CATEGORIES[categoryIndex];
    
    // Get values from props
    const currentApiData = propsApiData;
    const currentQuestionsData = propsQuestionsData;
    
    // Check if we should use API data (for completed categories)
    const shouldUseAPIData = currentApiData && currentApiData.useAPIData;
    
    if (shouldUseAPIData) {
      // Use questions and answers from API
      const apiQuestions = currentApiData.questions[currentApiData.categoryName] || [];
      // Sort questions to ensure consistent order
      const sortedQuestions = [...apiQuestions];
      setCategoryQuestions(sortedQuestions);
      
      // Load answers from API data
      if (currentApiData.answers) {
        setAnswers(currentApiData.answers);
      }
      
      // Enable review mode for API data
      setIsReviewMode(true);
    } else {
      // Use questions from state (for incomplete categories)
      let questions = currentQuestionsData[categoryName] || [];

      // If questions not in state, try to get from localStorage
      if (questions.length === 0) {
        const storedQuestions = localStorage.getItem("assessmentQuestions");
        if (storedQuestions) {
          try {
            const stored = JSON.parse(storedQuestions);
            if (stored.questions && stored.questions[categoryName]) {
              questions = [...stored.questions[categoryName]];
            }
          } catch (e) {
            console.error("Error parsing stored questions:", e);
          }
        }
      } else {
        // Ensure questions are sorted for consistency
        questions = [...questions];
      }

      setCategoryQuestions(questions);

      // Load saved progress for this category (only for incomplete categories)
      const savedProgress = localStorage.getItem("assessmentProgress");
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        const savedCategoryIndex = progress.categoryIndex || 0;

        // Only load if we're on the same category
        if (savedCategoryIndex === categoryIndex) {
          setQuestionIndex(progress.questionIndex || 0);
          setAnswers(progress.answers || {});
        }
      }
    }
    
    // Mark as initialized for this category
    initializedRef.current = categoryIndex;
  }, [show, initialCategoryIndex, propsQuestionsData, propsApiData, propsCurrentBand, propsEmployeeId, isCategoryCompleted, onHide]);

  // Immediate localStorage persistence (only for non-review mode)
  useEffect(() => {
    if (user && Object.keys(answers).length > 0 && !isReviewMode) {
      setIsSaving(true);
      const saveTimeout = setTimeout(() => {
        localStorage.setItem(
          "assessmentProgress",
          JSON.stringify({
            categoryIndex: currentCategoryIndex,
            questionIndex: questionIndex,
            answers: answers,
            lastSaved: new Date().toISOString(),
          })
        );
        setIsSaving(false);
      }, 300);
      return () => clearTimeout(saveTimeout);
    }
  }, [currentCategoryIndex, questionIndex, answers, user, isReviewMode]);

  const getQuestionKey = (catIndex, qIndex) => {
    return `category-${catIndex}-question-${qIndex}`;
  };

  const getCurrentQuestionKey = () => {
    return getQuestionKey(currentCategoryIndex, questionIndex);
  };

  const getCurrentAnswer = () => {
    const key = getCurrentQuestionKey();
    return answers[key] || { response: "" };
  };

  const handleAnswerChange = (value) => {
    if (isReviewMode) return; // Prevent changes in review mode

    const key = getCurrentQuestionKey();
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        response: value,
        timestamp: new Date().toISOString(),
      },
    }));
    setSubmitError(null);
  };

  const getAnsweredCount = () => {
    let count = 0;
    for (let q = 0; q < QUESTIONS_PER_CATEGORY; q++) {
      const key = getQuestionKey(currentCategoryIndex, q);
      if (answers[key] && answers[key].response) {
        count++;
      }
    }
    return count;
  };

  const isAllQuestionsAnswered = () => {
    return getAnsweredCount() === QUESTIONS_PER_CATEGORY;
  };

  // Submit category answers to API
  const submitCategoryToAPI = async () => {
    if (!user || !currentBand) {
      setSubmitError("Missing user or band information");
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const categoryName = CATEGORIES[currentCategoryIndex];
      const categoryAnswers = [];

      // Prepare all answers in the required format
      for (let q = 0; q < QUESTIONS_PER_CATEGORY; q++) {
        const key = getQuestionKey(currentCategoryIndex, q);
        const answer = answers[key];

        if (!answer || !answer.response) {
          throw new Error(`Question ${q + 1} is not answered`);
        }

        // Get the actual question text
        const questionText =
          categoryQuestions[q] ||
          questionsData[categoryName]?.[q] ||
          `Question ${q + 1}`;

        categoryAnswers.push({
          question: questionText,
          answer_value: answer.response,
        });
      }

      const payload = {
        employee_id: employeeId,
        band: currentBand,
        category: categoryName,
        answers: categoryAnswers,
      };

      console.log("Submitting payload:", JSON.stringify(payload, null, 2));

      const response = await axios.post(
        "http://localhost:8000/assessment/section/submit",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      // Check if submission was successful
      if (!response.data || !response.data.message) {
        throw new Error("Invalid response from server");
      }

      // Mark category as completed and API synced
      const completedCategories =
        localStorage.getItem("completedCategories") || "{}";
      const completedMap = JSON.parse(completedCategories);
      completedMap[`category-${currentCategoryIndex}`] = {
        completed: true,
        apiSynced: true,
        syncedAt: new Date().toISOString(),
        questionsCount: QUESTIONS_PER_CATEGORY,
        employeeId: employeeId,
        band: currentBand,
      };
      localStorage.setItem("completedCategories", JSON.stringify(completedMap));

      // Update assessment status
      const assessmentData = {
        currentBand: currentBand,
        status: "In Progress",
        lastCategoryCompleted: currentCategoryIndex,
        lastCategoryCompletedAt: new Date().toISOString(),
      };
      localStorage.setItem("assessmentData", JSON.stringify(assessmentData));

      // Keep answers for review but mark as submitted
      const progress = JSON.parse(
        localStorage.getItem("assessmentProgress") || "{}"
      );
      progress.submittedCategories = progress.submittedCategories || [];
      if (!progress.submittedCategories.includes(currentCategoryIndex)) {
        progress.submittedCategories.push(currentCategoryIndex);
      }
      localStorage.setItem("assessmentProgress", JSON.stringify(progress));

      setIsSubmitting(false);
      return true;
    } catch (error) {
      console.error("Error submitting category:", error);
      setSubmitError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to submit category. Please try again."
      );
      setIsSubmitting(false);
      return false;
    }
  };

  const handleNext = () => {
    if (isReviewMode) {
      // In review mode, navigate to next question
      if (questionIndex < QUESTIONS_PER_CATEGORY - 1) {
        setQuestionIndex((prev) => prev + 1);
      }
      return;
    }

    const currentKey = getCurrentQuestionKey();
    const currentAnswer = answers[currentKey];

    if (!currentAnswer || !currentAnswer.response) {
      alert("Please select an answer before proceeding.");
      return;
    }

    // Check if we've completed all questions in current category
    if (questionIndex === QUESTIONS_PER_CATEGORY - 1) {
      if (isAllQuestionsAnswered()) {
        setShowCongratulations(true);
      } else {
        alert("Please answer all questions before submitting.");
      }
    } else {
      setQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBackToDashboard = () => {
    onHide();
    if (onComplete) {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitCategory = async () => {
    setShowCongratulations(false);

    if (isReviewMode) {
      // Already submitted, just close modal
      onHide();
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const success = await submitCategoryToAPI();

    if (success) {
      setIsReviewMode(true);
      sessionStorage.setItem(
        "justCompleted",
        `You've successfully completed the ${CATEGORIES[currentCategoryIndex]} assessment`
      );
      // Close modal and refresh dashboard
      onHide();
      if (onComplete) {
        onComplete();
      }
    } else {
      // Error already set in submitCategoryToAPI
      // User can retry
    }
  };

  const handleRetrySubmit = () => {
    setSubmitError(null);
    handleSubmitCategory();
  };

  const handleClose = () => {
    onHide();
    if (onComplete && isReviewMode) {
      onComplete();
    }
  };

  if (!show || !user) {
    return null;
  }

  const currentAnswer = getCurrentAnswer();
  const categoryProgress = questionIndex + 1;
  const answeredCount = getAnsweredCount();
  const progressPercentage = (answeredCount / QUESTIONS_PER_CATEGORY) * 100;

  // Generate question text
  const getQuestionText = () => {
    const categoryName = CATEGORIES[currentCategoryIndex];
    const questions = questionsData[categoryName] || categoryQuestions;

    if (Array.isArray(questions) && questions.length > 0) {
      const question = questions[questionIndex];
      if (typeof question === "string") {
        return question;
      } else if (question && question.question) {
        return question.question;
      }
      return `Question ${questionIndex + 1}`;
    }
    return `Question ${questionIndex + 1} about ${categoryName}`;
  };

  return (
    <>
      {/* Assessment Modal */}
      <Modal
        show={true}
        onHide={handleClose}
        centered
        size="lg"
        backdrop="static"
        className="assessment-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="d-flex align-items-center gap-2">
              <span>{CATEGORIES[currentCategoryIndex]}</span>
              {isReviewMode && (
                <span className="badge bg-success" style={{ fontSize: "12px" }}>
                  <CheckCircle2 size={14} style={{ marginRight: "4px" }} />
                  Completed
                </span>
              )}
            </div>
            <p
              className="mb-0"
              style={{
                fontSize: "14px",
                fontWeight: "normal",
                marginTop: "4px",
              }}
            >
              Question {categoryProgress} of {QUESTIONS_PER_CATEGORY}
            </p>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="assessment-modal-body">
          {/* Progress Bar */}
          <div className="assessment-progress-section mb-4">
            <ProgressBar
              now={progressPercentage}
              className="assessment-progress-bar"
              variant={isReviewMode ? "success" : "primary"}
            />
            <p className="progress-text">
              {answeredCount}/{QUESTIONS_PER_CATEGORY} answered
              {isReviewMode && " (Completed)"}
            </p>
          </div>

          {/* Error Alert */}
          {submitError && (
            <Alert
              variant="danger"
              className="mb-3"
              dismissible
              onClose={() => setSubmitError(null)}
            >
              <Alert.Heading>Submission Failed</Alert.Heading>
              <p>{submitError}</p>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleRetrySubmit}
              >
                Retry Submission
              </Button>
            </Alert>
          )}

          {/* Question */}
          <div className="assessment-question-section mb-3">
            <p className="assessment-question-text">{getQuestionText()}</p>
          </div>

          {/* Answer Options */}
          <Form className="assessment-answer-section mb-4">
            <div className="likert-scale-options">
              {ANSWER_OPTIONS.map((option) => {
                const isSelected = currentAnswer.response === option.value;
                return (
                  <div
                    key={option.value}
                    className={`likert-option ${isSelected ? "selected" : ""} ${
                      isReviewMode ? "review-mode" : ""
                    }`}
                    onClick={() =>
                      !isReviewMode && handleAnswerChange(option.value)
                    }
                    style={{
                      cursor: isReviewMode ? "default" : "pointer",
                      opacity: isReviewMode && !isSelected ? 0.6 : 1,
                    }}
                  >
                    <div className="likert-option-content">
                      <div className="likert-option-header">
                        <span className="likert-option-number">
                          {option.value}
                        </span>
                        <span className="likert-option-label">
                          {option.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2
                            className="likert-check-icon"
                            size={20}
                          />
                        )}
                      </div>
                      <p className="likert-option-description">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Form.Check
                        type="radio"
                        name="answer"
                        value={option.value}
                        checked={true}
                        onChange={() => {}}
                        className="likert-radio"
                        disabled={isReviewMode}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <div className="w-100 d-flex align-items-center justify-content-between">
            <Button
              variant="outline-secondary"
              onClick={handlePrevious}
              disabled={questionIndex === 0}
              className="nav-btn-prev"
            >
              <span>← Previous</span>
            </Button>
            {isSaving && !isSubmitting && !isReviewMode && (
              <span className="saving-text">
                <Spinner size="sm" animation="border" className="me-2" />
                Saving...
              </span>
            )}
            {isSubmitting && !isReviewMode && (
              <span className="saving-text">
                <Spinner size="sm" animation="border" className="me-2" />
                Submitting...
              </span>
            )}
            {!isReviewMode && (
              <Button
                onClick={handleNext}
                className="nav-btn-next"
                disabled={!currentAnswer.response || isSubmitting}
              >
                {questionIndex === QUESTIONS_PER_CATEGORY - 1
                  ? "Submit"
                  : "Next →"}
              </Button>
            )}
            {isReviewMode && (
              <Button
                onClick={
                  questionIndex === QUESTIONS_PER_CATEGORY - 1
                    ? handleBackToDashboard
                    : handleNext
                }
                className="nav-btn-next"
              >
                {questionIndex === QUESTIONS_PER_CATEGORY - 1
                  ? "Back to Dashboard"
                  : "Next →"}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>

      {/* Congratulations Modal */}
      {!isReviewMode && (
        <CongratulationsModal
          show={showCongratulations}
          onHide={() => setShowCongratulations(false)}
          onSubmit={handleSubmitCategory}
          onReview={() => {
            setShowCongratulations(false);
            // Go to first question for review
            setQuestionIndex(0);
          }}
          categoryName={CATEGORIES[currentCategoryIndex]}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
};

export default Assessment;
