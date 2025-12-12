import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Celebration } from '@mui/icons-material';
import '../styles.css';
import './CongratulationsModal.css';

const CongratulationsModal = ({ show, onHide, onSubmit, onReview, categoryName }) => {
  return (
    <Modal show={show} onHide={onHide} centered className="congratulations-modal">
      <Modal.Body className="congratulations-modal-body">
        <div className="text-center">
          <Celebration className="celebration-icon" />
          <h2 className="congratulations-title">Congratulations!</h2>
          <p className="congratulations-message">
            You have completed all 25 questions for {categoryName}. Submit your assessment to unlock the next competency area.
          </p>
          <div className="congratulations-buttons">
            <Button
              variant="outline-secondary"
              onClick={onReview}
              className="review-btn"
            >
              Review Answers
            </Button>
            <Button
              onClick={onSubmit}
              className="submit-btn"
            >
              Submit Assessment
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CongratulationsModal;

