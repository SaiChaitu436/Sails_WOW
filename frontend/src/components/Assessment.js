import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import { CheckCircle2 } from 'lucide-react';
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

const Assessment = ({ show, onHide, categoryIndex: initialCategoryIndex = 0, questionsData: initialQuestionsData = {} }) => {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(initialCategoryIndex);
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
  const [questionsData, setQuestionsData] = useState(initialQuestionsData);

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
    if (!show) return; // Only load when modal is shown
    
    const userData = localStorage.getItem('user');
    if (!userData) {
      onHide();
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

    // Set category index from prop
    if (initialCategoryIndex >= 0 && initialCategoryIndex < CATEGORIES.length) {
      setCurrentCategoryIndex(initialCategoryIndex);
      
      // Check if this category is already completed (review mode)
      if (isCategoryCompleted(initialCategoryIndex)) {
        setIsReviewMode(true);
      }
    }

    // Load questions for current category
    const categoryName = CATEGORIES[initialCategoryIndex];
    const questions = initialQuestionsData[categoryName] || [];
    
    // If questions not in state, try to fetch them from API
    if (questions.length === 0 && parsedUser) {
      // Fetch questions from API if not available in state
      const fetchQuestionsForCategory = async () => {
        try {
          const employeeId = parsedUser.id || parsedUser.employeeId || parsedUser.employee_id || 'SS005';
          // Get band from localStorage or use default
          const assessmentData = localStorage.getItem('assessmentData');
          const band = assessmentData ? JSON.parse(assessmentData).currentBand : '2A';
          const bandName = band.startsWith('band') ? band : `band${band}`;
          
          const response = await axios.get(
            `http://localhost:8000/bands/${bandName}/random-questions`,
            {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              }
            }
          );
          
          const data = response.data.questions;
          // Map Competency values from database to frontend competency IDs
          const competencyMapping = {
            "Communication": "Communication",
            "Adaptability & Learning Agility": "Adaptability & Learning Agility",
            "Teamwork & Collaboration": "Teamwork & Collaboration",
            "Accountability & Ownership": "Accountability & Ownership",
            "Problem Solving & Critical Thinking": "Problem Solving & Critical Thinking",
          };
          
          const grouped = data.reduce((acc, item) => {
            // Use Competency field from database (case-insensitive matching)
            const competency = item.Competency || item.competency;
            const questionText = item.Question || item.question;
            
            if (!competency || !questionText) return acc;
            
            // Find matching competency ID (case-insensitive)
            const compId = Object.keys(competencyMapping).find(
              key => key.toLowerCase() === competency.toLowerCase()
            ) || competencyMapping[competency];
            
            if (!compId) return acc;
            
            if (!acc[compId]) acc[compId] = [];
            acc[compId].push(questionText);
            return acc;
          }, {});
          
          const categoryQuestions = grouped[categoryName] || [];
          setCategoryQuestions(categoryQuestions);
          // Update questionsData state
          setQuestionsData(grouped);
        } catch (error) {
          console.error('Error fetching questions:', error);
          setCategoryQuestions([]);
        }
      };
      
      fetchQuestionsForCategory();
    } else {
      setCategoryQuestions(questions);
    }

    // Load saved progress for this category
    const savedProgress = localStorage.getItem('assessmentProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      const savedCategoryIndex = progress.categoryIndex || 0;
      
      // Only load if we're on the same category
      if (savedCategoryIndex === initialCategoryIndex) {
        setQuestionIndex(progress.questionIndex || 0);
        setAnswers(progress.answers || {});
      }
    }

    // Load previous section answers from API only if:
    // 1. Category is not completed AND
    // 2. Category is not the first one (categoryIndex > 0) - meaning user has progressed past first category
    // OR there are existing answers in localStorage for this category (meaning user started it before)
    // For the first category (categoryIndex === 0), only load from API if there are local answers
    // This prevents calling the wrong API when starting fresh
    const savedProgressForCheck = localStorage.getItem('assessmentProgress');
    let hasLocalAnswers = false;
    if (savedProgressForCheck) {
      try {
        const progressData = JSON.parse(savedProgressForCheck);
        const progressAnswers = progressData.answers || {};
        hasLocalAnswers = Object.keys(progressAnswers).some(key => key.startsWith(`category-${initialCategoryIndex}-`));
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Only call category API if:
    // - Category is not completed AND
    // - (Category is not first OR has local answers)
    const shouldLoadFromAPI = parsedUser && categoryName && !isCategoryCompleted(initialCategoryIndex) && 
                              (initialCategoryIndex > 0 || hasLocalAnswers);
    
    if (shouldLoadFromAPI) {
      const employeeId = parsedUser.id || parsedUser.employeeId || parsedUser.employee_id || 'SS005';
      loadPreviousSectionAnswers(categoryName, employeeId);
    }
  }, [show, initialCategoryIndex, initialQuestionsData, isCategoryCompleted, onHide]);

  // Update categoryQuestions when questionsData changes
  useEffect(() => {
    if (!show) return;
    const categoryName = CATEGORIES[currentCategoryIndex];
    const questions = questionsData[categoryName] || [];
    
    if (questions.length > 0) {
      setCategoryQuestions(questions);
    }
  }, [questionsData, currentCategoryIndex, show]);

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

      // Clear localStorage if assessment is completed
      if (isAssessmentCompleted || response.data.clear_local_storage) {
        // Clear assessment-related localStorage items
        localStorage.removeItem('assessmentProgress');
        localStorage.removeItem('completedCategories');
        // Keep assessmentData for history display
      }

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
    onHide();
  };

  const handlePrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitCategory = async () => {
    setShowCongratulations(false);
    
    if (isReviewMode) {
      // Already submitted, just close modal
      onHide();
      return;
    }

    const success = await submitCategoryToAPI();
    
    if (success) {
      setIsReviewMode(true);
      sessionStorage.setItem(
        'justCompleted', 
        `You've successfully completed the ${CATEGORIES[currentCategoryIndex]} assessment`
      );
      // Close modal after a short delay
      setTimeout(() => {
        onHide();
        // Trigger page refresh to update dashboard
        window.location.reload();
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
    // Reset state when closing (but keep answers in localStorage for persistence)
    setQuestionIndex(0);
    setSubmitError(null);
    setShowCongratulations(false);
    onHide();
  };

  if (!user || !show) {
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
    <Modal show={show} onHide={handleClose} centered size="lg" className="assessment-modal">
      <Modal.Body className="assessment-modal-body">
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
                          <span className="likert-option-bullet">•</span>
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
      </Modal.Body>

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
    </Modal>
  );
};

export default Assessment;
