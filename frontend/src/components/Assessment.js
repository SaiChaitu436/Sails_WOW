import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, Form, Button, ProgressBar, Container, Alert, Spinner } from 'react-bootstrap';
import { ArrowLeft, CheckCircle2, Clock, LogOut, Lock } from 'lucide-react';
import { Close, Check, ArrowBack, ArrowForward, AccessTime, Celebration } from '@mui/icons-material';
import axios from 'axios';
import CongratulationsModal from './CongratulationsModal';
import '../styles.css';
import './Assessment.css';

const CATEGORIES = [
  'Communication',
  'Adaptability & Learning Agility',
  'Teamwork & Collaboration',
  'Accountability & Ownership',
  'Problem Solving & Critical Thinking'
];

const QUESTIONS_PER_CATEGORY = 25;

const ANSWER_OPTIONS = [
  { value: '5', label: 'Always', description: 'I do this confidently, every time' },
  { value: '4', label: 'Often', description: 'I usually do this without being reminded' },
  { value: '3', label: 'Sometimes', description: 'I try to do this when I remember' },
  { value: '2', label: 'Rarely', description: "I'm still getting used to this" },
  { value: '1', label: 'Not yet', description: "I haven't tried this before" }
];

const Assessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const questionsData = location.state || {};
  const [searchParams] = useSearchParams();
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [user, setUser] = useState(null);
  const [currentBand, setCurrentBand] = useState('2B');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [categoryQuestions, setCategoryQuestions] = useState([]);

  // Check if category is completed and synced with API
  const isCategoryCompleted = useCallback((categoryIndex) => {
    const completedCategories = localStorage.getItem('completedCategories') || '{}';
    const completedMap = JSON.parse(completedCategories);
    const categoryKey = `category-${categoryIndex}`;
    return completedMap[categoryKey]?.apiSynced === true;
  }, []);

  const getQuestionKey = (catIndex, qIndex) => {
    return `category-${catIndex}-question-${qIndex}`;
  };

  // Load previous section answers from API
  const loadPreviousSectionAnswers = async (categoryName, employeeId) => {
    try {
      const response = await axios.get(
        `http://localhost:8000/assessment/${encodeURIComponent(categoryName)}/${employeeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      if (response.data && response.data.questions && response.data.questions.length > 0) {
        // Map API questions with answers to local state format
        const loadedAnswers = {};
        const categoryIndex = CATEGORIES.indexOf(categoryName);
        
        response.data.questions.forEach((qa, index) => {
          if (qa.is_answered && qa.answer_value) {
            const key = getQuestionKey(categoryIndex, index);
            loadedAnswers[key] = {
              response: qa.answer_value,
              timestamp: new Date().toISOString()
            };
          }
        });

        // Merge with existing answers
        setAnswers(prev => ({
          ...prev,
          ...loadedAnswers
        }));
        
        // If all questions are answered, mark as review mode
        const answeredCount = Object.keys(loadedAnswers).length;
        if (answeredCount === QUESTIONS_PER_CATEGORY) {
          setIsReviewMode(true);
        }
      }
    } catch (error) {
      console.error('Error loading previous section answers:', error);
      // Don't show error to user, just continue with empty answers
    }
  };

  // Load user and initial state
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Load band from localStorage or API
    const assessmentData = localStorage.getItem('assessmentData');
    if (assessmentData) {
      const data = JSON.parse(assessmentData);
      setCurrentBand(data.currentBand || '2A');
    }

    // Check for category parameter
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const catIndex = parseInt(categoryParam);
      if (catIndex >= 0 && catIndex < CATEGORIES.length) {
        setCurrentCategoryIndex(catIndex);
        
        // Check if this category is already completed (review mode)
        if (isCategoryCompleted(catIndex)) {
          setIsReviewMode(true);
        }
      }
    }

    // Load questions for current category
    const categoryIndex = parseInt(categoryParam) || 0;
    const categoryName = CATEGORIES[categoryIndex];
    const questions = questionsData[categoryName] || [];
    
    // If questions not in state, try to fetch them
    if (questions.length === 0 && parsedUser) {
      // Questions will be loaded from Dashboard, but we can also fetch here if needed
      setCategoryQuestions([]);
    } else {
      setCategoryQuestions(questions);
    }

    // Load saved progress for this category
    const savedProgress = localStorage.getItem('assessmentProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      const savedCategoryIndex = progress.categoryIndex || 0;
      
      // Only load if we're on the same category
      if (savedCategoryIndex === (parseInt(categoryParam) || 0)) {
        setQuestionIndex(progress.questionIndex || 0);
        setAnswers(progress.answers || {});
      }
    }

    // Load previous section answers from API if category is not completed
    if (parsedUser && categoryName && !isCategoryCompleted(categoryIndex)) {
      const employeeId = parsedUser.id || parsedUser.employeeId || parsedUser.employee_id || 'SS005';
      loadPreviousSectionAnswers(categoryName, employeeId);
    }
  }, [navigate, searchParams, questionsData, isCategoryCompleted]);

  // Immediate localStorage persistence
  useEffect(() => {
    if (user && Object.keys(answers).length > 0) {
      setIsSaving(true);
      const saveTimeout = setTimeout(() => {
        localStorage.setItem('assessmentProgress', JSON.stringify({
          categoryIndex: currentCategoryIndex,
          questionIndex: questionIndex,
          answers: answers,
          lastSaved: new Date().toISOString()
        }));
        setIsSaving(false);
      }, 300);
      return () => clearTimeout(saveTimeout);
    }
  }, [currentCategoryIndex, questionIndex, answers, user]);

  const getCurrentQuestionKey = () => {
    return getQuestionKey(currentCategoryIndex, questionIndex);
  };

  const getCurrentAnswer = () => {
    const key = getCurrentQuestionKey();
    return answers[key] || { response: '' };
  };

  const handleAnswerChange = (value) => {
    if (isReviewMode) return; // Prevent changes in review mode
    
    const key = getCurrentQuestionKey();
    setAnswers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        response: value,
        timestamp: new Date().toISOString()
      }
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
      setSubmitError('Missing user or band information');
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const categoryName = CATEGORIES[currentCategoryIndex];
      const employeeId = user.id || user.employeeId || user.employee_id || 'SS005';
      const categoryAnswers = [];

      // Prepare all answers in the required format
      for (let q = 0; q < QUESTIONS_PER_CATEGORY; q++) {
        const key = getQuestionKey(currentCategoryIndex, q);
        const answer = answers[key];
        
        if (!answer || !answer.response) {
          throw new Error(`Question ${q + 1} is not answered`);
        }

        // Get the actual question text
        const questionText = categoryQuestions[q] || questionsData[categoryName]?.[q] || `Question ${q + 1}`;
        
        categoryAnswers.push({
          question: questionText,
          answer_value: answer.response
        });
      }

      const payload = {
        employee_id: employeeId,
        band: currentBand,
        category: categoryName,
        answers: categoryAnswers
      };

      console.log('Submitting payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        'http://localhost:8000/assessment/section/submit',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      // Check if submission was successful
      if (!response.data || !response.data.message) {
        throw new Error('Invalid response from server');
      }

      // Mark category as completed and API synced
      const completedCategories = localStorage.getItem('completedCategories') || '{}';
      const completedMap = JSON.parse(completedCategories);
      completedMap[`category-${currentCategoryIndex}`] = {
        completed: true,
        apiSynced: true,
        syncedAt: new Date().toISOString(),
        questionsCount: QUESTIONS_PER_CATEGORY,
        employeeId: employeeId,
        band: currentBand
      };
      localStorage.setItem('completedCategories', JSON.stringify(completedMap));

      // Update assessment status based on API response
      const isAssessmentCompleted = response.data.is_completed || false;
      const assessmentData = {
        currentBand: currentBand,
        status: isAssessmentCompleted ? 'completed' : 'In Progress',
        lastCategoryCompleted: currentCategoryIndex,
        lastCategoryCompletedAt: new Date().toISOString(),
        completedAt: isAssessmentCompleted ? new Date().toISOString() : null,
        totalScore: response.data.total_score || null,
        categoryScores: response.data.category_scores || null
      };
      localStorage.setItem('assessmentData', JSON.stringify(assessmentData));

      // Keep answers for review but mark as submitted
      const progress = JSON.parse(localStorage.getItem('assessmentProgress') || '{}');
      progress.submittedCategories = progress.submittedCategories || [];
      if (!progress.submittedCategories.includes(currentCategoryIndex)) {
        progress.submittedCategories.push(currentCategoryIndex);
      }
      localStorage.setItem('assessmentProgress', JSON.stringify(progress));

      setIsSubmitting(false);
      return true;
    } catch (error) {
      console.error('Error submitting category:', error);
      setSubmitError(
        error.response?.data?.detail || 
        error.message || 
        'Failed to submit category. Please try again.'
      );
      setIsSubmitting(false);
      return false;
    }
  };

  const handleNext = () => {
    if (isReviewMode) {
      // In review mode, navigate to next question
      if (questionIndex < QUESTIONS_PER_CATEGORY - 1) {
        setQuestionIndex(prev => prev + 1);
      }
      return;
    }

    const currentKey = getCurrentQuestionKey();
    const currentAnswer = answers[currentKey];

    if (!currentAnswer || !currentAnswer.response) {
      alert('Please select an answer before proceeding.');
      return;
    }

    // Check if we've completed all questions in current category
    if (questionIndex === QUESTIONS_PER_CATEGORY - 1) {
      if (isAllQuestionsAnswered()) {
        setShowCongratulations(true);
      } else {
        alert('Please answer all questions before submitting.');
      }
    } else {
      setQuestionIndex(prev => prev + 1);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handlePrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitCategory = async () => {
    setShowCongratulations(false);
    
    if (isReviewMode) {
      // Already submitted, just navigate back
      navigate('/dashboard');
      return;
    }

    const success = await submitCategoryToAPI();
    
    if (success) {
      setIsReviewMode(true);
      sessionStorage.setItem(
        'justCompleted', 
        `You've successfully completed the ${CATEGORIES[currentCategoryIndex]} assessment`
      );
      // Navigate back to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
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
    navigate('/dashboard');
  };

  if (!user) {
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
      // Handle both array of strings and array of objects
      const question = questions[questionIndex];
      if (typeof question === 'string') {
        return question;
      } else if (question && question.question) {
        return question.question;
      }
      return `Question ${questionIndex + 1}`;
    }
    return `Question ${questionIndex + 1} about ${categoryName}`;
  };

  return (
    <div className="assessment-page-container">
      {/* Dashboard Background */}
      <div className="assessment-background">
        <div className="dashboard-background-content">
          <Container className="py-4">
            {/* Header */}
            <div className="dashboard-header mb-4">
              <div className="d-flex align-items-center">
                <ArrowBack 
                  className="header-icon" 
                  style={{ marginRight: '16px', cursor: 'pointer' }}
                  onClick={handleClose}
                />
                <div>
                  <h1 className="dashboard-title">Employee Dashboard</h1>
                  <p className="dashboard-subtitle">Welcome back, {user.fullName || user.name}</p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <div className="band-badge">{currentBand}</div>
                <ArrowForward className="header-icon" style={{ marginLeft: '16px' }} />
              </div>
            </div>
          </Container>
        </div>
      </div>

      {/* Assessment Modal */}
      <div className="modal-overlay">
        <Card className="card-base assessment-modal-card">
          <Card.Body className="assessment-modal-body">
            {/* Modal Header */}
            <div className="assessment-modal-header">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <p className="assessment-modal-title">{CATEGORIES[currentCategoryIndex]}</p>
                  {isReviewMode && (
                    <span className="badge bg-success" style={{ fontSize: '12px' }}>
                      <CheckCircle2 size={14} style={{ marginRight: '4px' }} />
                      Completed
                    </span>
                  )}
                </div>
                <p className="assessment-modal-subtitle">
                  Question {categoryProgress} of {QUESTIONS_PER_CATEGORY}
                </p>
              </div>
              <button 
                className="btn-close"
                onClick={handleClose}
                aria-label="Close"
              />
            </div>

            {/* Progress Bar */}
            <div className="assessment-progress-section mb-4">
              <ProgressBar 
                now={progressPercentage} 
                className="assessment-progress-bar"
                variant={isReviewMode ? 'success' : 'primary'}
              />
              <p className="progress-text">
                {answeredCount}/{QUESTIONS_PER_CATEGORY} answered
                {isReviewMode && ' (Completed)'}
              </p>
            </div>

            {/* Error Alert */}
            {submitError && (
              <Alert variant="danger" className="mb-3" dismissible onClose={() => setSubmitError(null)}>
                <Alert.Heading>Submission Failed</Alert.Heading>
                <p>{submitError}</p>
                <Button variant="outline-danger" size="sm" onClick={handleRetrySubmit}>
                  Retry Submission
                </Button>
              </Alert>
            )}

            {/* Question */}
            <div className="assessment-question-section mb-2">
              <p className="assessment-question-text">{getQuestionText()}</p>
            </div>

            {/* Answer Options */}
            <Form className="assessment-answer-section mb-4">
              <div className="likert-scale-options">
                {ANSWER_OPTIONS.map(option => {
                  const isSelected = currentAnswer.response === option.value;
                  return (
                    <div
                      key={option.value}
                      className={`likert-option ${isSelected ? 'selected' : ''} ${isReviewMode ? 'review-mode' : ''}`}
                      onClick={() => !isReviewMode && handleAnswerChange(option.value)}
                      style={{ 
                        cursor: isReviewMode ? 'default' : 'pointer',
                        opacity: isReviewMode && !isSelected ? 0.6 : 1
                      }}
                    >
                      <div className="likert-option-content">
                        <div className="likert-option-header">
                          <span className="likert-option-number">{option.value}</span>
                          <span className="likert-option-label">{option.label}</span>
                          {isSelected && <CheckCircle2 className="likert-check-icon" size={20} />}
                        </div>
                        <p className="likert-option-description">{option.description}</p>
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

            {/* Navigation Buttons */}
            <div className="assessment-navigation">
              <Button
                variant="outline-secondary"
                onClick={handlePrevious}
                disabled={questionIndex === 0}
                className="nav-btn-prev"
              >
                <span>← Previous</span>
              </Button>
                {isSaving && !isSubmitting && (
                  <span className="saving-text">
                    <Spinner size="sm" animation="border" className="me-2" />
                    Saving...
                  </span>
                )}
                {isSubmitting && (
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
                    {questionIndex === QUESTIONS_PER_CATEGORY - 1 ? 'Submit' : 'Next →'}
                  </Button>
                )}
                {isReviewMode && (
                  <Button
                    onClick={questionIndex === QUESTIONS_PER_CATEGORY - 1 ? handleBackToDashboard : handleNext}
                    className="nav-btn-next"
                  >
                    {questionIndex === QUESTIONS_PER_CATEGORY - 1 ? 'Back to Dashboard' : 'Next →'}
                  </Button>
                )}
            </div>
          </Card.Body>
        </Card>
      </div>

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
    </div>
  );
};

export default Assessment;
