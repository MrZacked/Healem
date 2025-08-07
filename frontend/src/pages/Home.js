import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="bg-light">
      <section className="py-5 bg-primary text-white">
        <Container>
          <Row className="align-items-center">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">
                Welcome to Healem
              </h1>
              <p className="lead mb-4">
                Your comprehensive health management platform connecting patients 
                with healthcare providers for seamless care coordination.
              </p>
              {!user ? (
                <div>
                  <Link to="/register">
                    <Button variant="light" size="lg" className="me-3">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline-light" size="lg">
                      Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link to="/dashboard">
                  <Button variant="light" size="lg">
                    Go to Dashboard
                  </Button>
                </Link>
              )}
            </Col>
            <Col lg={6} className="text-center">
              <div className="bg-white bg-opacity-10 p-4 rounded">
                <h3>Healthcare Made Simple</h3>
                <p>Book appointments, manage health records, and communicate with your healthcare team.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="fw-bold">Key Features</h2>
              <p className="text-muted">Everything you need for comprehensive healthcare management</p>
            </Col>
          </Row>
          
          <Row>
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <span className="text-primary fw-bold">📅</span>
                  </div>
                  <h5>Easy Scheduling</h5>
                  <p className="text-muted small">
                    Book appointments with your preferred healthcare providers at convenient times.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <span className="text-success fw-bold">💬</span>
                  </div>
                  <h5>Secure Messaging</h5>
                  <p className="text-muted small">
                    Communicate securely with your healthcare team and get timely responses.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <span className="text-info fw-bold">👥</span>
                  </div>
                  <h5>Role-based Access</h5>
                  <p className="text-muted small">
                    Tailored experience for patients, doctors, nurses, and administrators.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6} lg={3} className="mb-4">
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" 
                       style={{ width: '60px', height: '60px' }}>
                    <span className="text-warning fw-bold">🔒</span>
                  </div>
                  <h5>Secure & Private</h5>
                  <p className="text-muted small">
                    Your health information is protected with enterprise-grade security.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {!user && (
        <section className="py-5 bg-primary text-white">
          <Container>
            <Row className="text-center">
              <Col>
                <h3 className="mb-3">Ready to get started?</h3>
                <p className="mb-4">Join thousands of patients and healthcare providers using Healem.</p>
                <Link to="/register">
                  <Button variant="light" size="lg">
                    Create Your Account
                  </Button>
                </Link>
              </Col>
            </Row>
          </Container>
        </section>
      )}
    </div>
  );
};

export default Home;