import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Card, Form, Button, ProgressBar, Container } from 'react-bootstrap';
import { Close, Check, ArrowBack, ArrowForward, AccessTime } from '@mui/icons-material';
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
  console.log("questionsData",questionsData);
  const [searchParams] = useSearchParams();
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [user, setUser] = useState(null);
  const [currentBand, setCurrentBand] = useState('2A');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load user data
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(userData));

    // Load assessment data
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
      }
    }

    // Load saved progress
    const savedProgress = localStorage.getItem('assessmentProgress');
    console.log("assessmentDtaa",savedProgress)
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      // Only load if we're on the same category or no category param
      if (!categoryParam || progress.categoryIndex === parseInt(categoryParam)) {
        setCurrentCategoryIndex(progress.categoryIndex || 0);
        setQuestionIndex(progress.questionIndex || 0);
        setAnswers(progress.answers || {});
      } else {
        setQuestionIndex(0);
        setAnswers({});
      }
    }
  }, [navigate, searchParams]);

  // Save progress to localStorage
  useEffect(() => {
    if (user) {
      setIsSaving(true);
      const saveTimeout = setTimeout(() => {
        localStorage.setItem('assessmentProgress', JSON.stringify({
          categoryIndex: currentCategoryIndex,
          questionIndex: questionIndex,
          answers: answers
        }));
        setIsSaving(false);
      }, 500);
      return () => clearTimeout(saveTimeout);
    }
  }, [currentCategoryIndex, questionIndex, answers, user]);

  const getQuestionKey = (catIndex, qIndex) => {
    return `category-${catIndex}-question-${qIndex}`;
  };

  const getCurrentQuestionKey = () => {
    return getQuestionKey(currentCategoryIndex, questionIndex);
  };

  const getCurrentAnswer = () => {
    const key = getCurrentQuestionKey();
    return answers[key] || { response: '' };
  };

  const handleAnswerChange = (value) => {
    const key = getCurrentQuestionKey();
    setAnswers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        response: value
      }
    }));
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

  const handleNext = () => {
    const currentKey = getCurrentQuestionKey();
    const currentAnswer = answers[currentKey];

    if (!currentAnswer || !currentAnswer.response) {
      alert('Please select an answer before proceeding.');
      return;
    }

    // Check if we've completed all questions in current category
    if (questionIndex === QUESTIONS_PER_CATEGORY - 1) {
      // Show congratulations modal
      setShowCongratulations(true);
    } else {
      // Move to next question in same category
      setQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitCategory = () => {
    // Save completed category
    const completed = localStorage.getItem('completedCompetencies') || '{}';
    console.log("completed",completed)
    const completedMap = JSON.parse(completed);
    completedMap[`category-${currentCategoryIndex}`] = QUESTIONS_PER_CATEGORY;
    localStorage.setItem('completedCompetencies', JSON.stringify(completedMap));

    // Update assessment status
    localStorage.setItem('assessmentData', JSON.stringify({
      currentBand: currentBand,
      status: 'In Progress'
    }));

    // Show toast message
    sessionStorage.setItem('justCompleted', `You've completed the ${CATEGORIES[currentCategoryIndex]} assessment`);

    // Navigate back to dashboard
    navigate('/dashboard');
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

  // Generate question text
  const getQuestionText = () => {
    const categoryName = CATEGORIES[currentCategoryIndex];

    // Ensure questions are accessed in the correct order
    const templates = questionsData[categoryName] || ['Question about your skills and capabilities'];
    const sortedTemplates = Array.isArray(templates) ? templates : Object.values(templates).sort(); // Sort if necessary

    return sortedTemplates[questionIndex % sortedTemplates.length] || sortedTemplates[0];
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
                <ArrowBack className="header-icon" style={{ marginRight: '16px' }} />
                <div>
                  <h1 className="dashboard-title">Employee Dashboard</h1>
                  <p className="dashboard-subtitle">Welcome back, {user.fullName}</p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <div className="band-badge">{currentBand}</div>
                <ArrowForward className="header-icon" style={{ marginLeft: '16px' }} />
              </div>
            </div>
            {/* Other dashboard elements would be here but blurred */}
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
                <p className="assessment-modal-title">{CATEGORIES[currentCategoryIndex]}</p>
                <p className="assessment-modal-subtitle">Question {categoryProgress} of {QUESTIONS_PER_CATEGORY}</p>
              </div>
              <Close 
                className="close-icon" 
                onClick={handleClose}
                style={{ cursor: 'pointer' }}
              />
            </div>

            {/* Progress Bar */}
            <div className="assessment-progress-section mb-4">
              <ProgressBar 
                now={(answeredCount / QUESTIONS_PER_CATEGORY) * 100} 
                className="assessment-progress-bar"
              />
              <p className="progress-text">{answeredCount}/{QUESTIONS_PER_CATEGORY} answered</p>
            </div>

            {/* Question */}
            <div className="assessment-question-section mb-4">
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
                      className={`likert-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleAnswerChange(option.value)}
                    >
                      <div className="likert-option-content">
                        <div className="likert-option-header">
                          <span className="likert-option-number">{option.value}</span>
                          <span className="likert-option-label">{option.label}</span>
                          {isSelected && <Check className="likert-check-icon" />}
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
              {isSaving && (
                <span className="saving-text">Saving...</span>
              )}
              <Button
                onClick={handleNext}
                className="nav-btn-next"
                disabled={!currentAnswer.response}
              >
                {questionIndex === QUESTIONS_PER_CATEGORY - 1 ? 'Submit' : 'Next →'}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Congratulations Modal */}
      <CongratulationsModal
        show={showCongratulations}
        onHide={() => setShowCongratulations(false)}
        onSubmit={handleSubmitCategory}
        onReview={() => setShowCongratulations(false)}
        categoryName={CATEGORIES[currentCategoryIndex]}
      />
    </div>
  );
};

export default Assessment;
