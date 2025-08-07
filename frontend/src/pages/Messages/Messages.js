import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const Messages = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <h2>Messages</h2>
              <p>Messaging interface will be implemented here.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Messages;