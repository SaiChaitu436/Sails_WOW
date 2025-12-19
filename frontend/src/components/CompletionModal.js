import React from 'react';
import { Modal, Button, ProgressBar } from 'react-bootstrap';
import './CompletionModal.css';

const CompletionModal = ({ show, onHide, results }) => {
  if (!results) return null;

  const nextAssessmentDate = new Date();
  nextAssessmentDate.setDate(nextAssessmentDate.getDate() + 45);

  return (
    <Modal show={show} onHide={onHide} centered size="lg" className="completion-modal">
      <Modal.Header closeButton className="completion-header">
        <Modal.Title>Assessment Completed</Modal.Title>
      </Modal.Header>
      <Modal.Body className="completion-body">
        <div className="text-center mb-4">
          <h3 className={`status-title ${results.passed ? 'passed' : 'failed'}`}>
            {results.passed ? 'Congratulations! You Passed' : 'Assessment Completed'}
          </h3>
          <p className="overall-score-text">
            Overall Score: <span className="score-value">{results.overallScore}%</span>
          </p>
        </div>

        <div className="category-scores-section">
          <h5 className="section-title">Category Scores</h5>
          {results.categoryScores.map((category, index) => (
            <div key={index} className="category-score-item mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span className="category-name">{category.category}</span>
                <span className={`category-percentage ${category.score >= 75 ? 'high' : category.score >= 50 ? 'medium' : 'low'}`}>
                  {category.score.toFixed(1)}%
                </span>
              </div>
              <ProgressBar 
                now={category.score} 
                className={`category-score-bar ${category.score >= 75 ? 'high' : category.score >= 50 ? 'medium' : 'low'}`}
              />
            </div>
          ))}
        </div>

        <div className="criteria-section mb-4">
          <h5 className="section-title">Passing Criteria</h5>
          <div className="criteria-list">
            <div className={`criteria-item ${results.categoryScores.every(c => c.score > 50) ? 'met' : 'not-met'}`}>
              <span className="criteria-icon">{results.categoryScores.every(c => c.score > 50) ? '✓' : '✗'}</span>
              <span>All categories above 50%</span>
            </div>
            <div className={`criteria-item ${results.categoryScores.filter(c => c.score > 75).length >= 3 ? 'met' : 'not-met'}`}>
              <span className="criteria-icon">{results.categoryScores.filter(c => c.score > 75).length >= 3 ? '✓' : '✗'}</span>
              <span>At least 3 categories above 75%</span>
            </div>
          </div>
        </div>

        {results.passed && (
          <div className="next-assessment-info">
            <p className="info-text">
              <strong>Next Assessment On:</strong>
            </p>
            <p className="date-text">
              {nextAssessmentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} (45 days from today)
            </p>
          </div>
        )}

        {!results.passed && (
          <div className="next-assessment-info">
            <p className="info-text">
              <strong>Next Assessment Available:</strong>
            </p>
            <p className="date-text">
              {nextAssessmentDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} (45 days from today)
            </p>
            <p className="retry-text">
              You can retake the assessment after the cooldown period to improve your scores.
            </p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer className="completion-footer">
        <Button onClick={onHide} className="close-btn">
          Return to Dashboard
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CompletionModal;

