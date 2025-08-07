import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light py-4 mt-auto">
      <Container>
        <Row>
          <Col md={6}>
            <h5>Healem Health Management</h5>
            <p className="mb-0">
              Healthcare management system for people around the world.
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <p className="mb-1">
              <strong>Emergency:</strong> 911
            </p>
            <p className="mb-1">
              <strong>Support:</strong> support@healem.com
            </p>
            <p className="mb-0">
              © {currentYear} Healem. All rights reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;