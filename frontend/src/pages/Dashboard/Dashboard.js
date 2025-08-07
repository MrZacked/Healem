import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsAPI, messagesAPI } from '../../services/api';
import { format, isToday, isTomorrow } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    upcomingAppointments: [],
    recentMessages: [],
    totalAppointments: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const [appointmentsResponse, messagesResponse, unreadResponse] = await Promise.all([
        appointmentsAPI.getAppointments({
          limit: 5,
          status: user.role === 'patient' ? undefined : 'pending'
        }),
        messagesAPI.getInbox({ limit: 3 }),
        messagesAPI.getUnreadCount()
      ]);

      setStats({
        upcomingAppointments: appointmentsResponse.data.appointments || [],
        recentMessages: messagesResponse.data.messages || [],
        totalAppointments: appointmentsResponse.data.pagination?.total || 0,
        unreadMessages: unreadResponse.data.unreadCount || 0
      });

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentTimeLabel = (appointmentDate) => {
    const date = new Date(appointmentDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd');
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      confirmed: 'success',
      cancelled: 'danger',
      completed: 'info'
    };
    return variants[status] || 'secondary';
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="mb-1">
            Welcome back, {user?.profile?.firstName}!
          </h1>
          <p className="text-muted">
            Here's your healthcare dashboard overview
          </p>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="text-primary mb-2">
                <h2 className="mb-0">{stats.totalAppointments}</h2>
              </div>
              <h6 className="text-muted mb-0">
                {user.role === 'patient' ? 'My Appointments' : 'Total Appointments'}
              </h6>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="text-success mb-2">
                <h2 className="mb-0">{stats.upcomingAppointments.length}</h2>
              </div>
              <h6 className="text-muted mb-0">
                {user.role === 'patient' ? 'Upcoming' : 'Pending Review'}
              </h6>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="text-info mb-2">
                <h2 className="mb-0">{stats.unreadMessages}</h2>
              </div>
              <h6 className="text-muted mb-0">Unread Messages</h6>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="text-warning mb-2">
                <h2 className="mb-0">{stats.recentMessages.length}</h2>
              </div>
              <h6 className="text-muted mb-0">Recent Messages</h6>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  {user.role === 'patient' ? 'Upcoming Appointments' : 'Recent Appointments'}
                </h5>
                <Link to="/appointments">
                  <Button variant="outline-primary" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {stats.upcomingAppointments.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>No appointments found</p>
                  {user.role === 'patient' && (
                    <Link to="/appointments/book">
                      <Button variant="primary">Book Your First Appointment</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {stats.upcomingAppointments.map((appointment) => (
                    <div key={appointment._id} className="list-group-item border-0 px-0">
                      <Row className="align-items-center">
                        <Col md={3}>
                          <small className="text-muted">
                            {getAppointmentTimeLabel(appointment.appointmentDate)}
                          </small>
                          <div className="fw-semibold">
                            {appointment.timeSlot?.start} - {appointment.timeSlot?.end}
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="fw-semibold">
                            {user.role === 'patient' 
                              ? `Dr. ${appointment.doctor?.profile?.firstName} ${appointment.doctor?.profile?.lastName}`
                              : `${appointment.patient?.profile?.firstName} ${appointment.patient?.profile?.lastName}`
                            }
                          </div>
                          <small className="text-muted">
                            {appointment.reason?.substring(0, 50)}
                            {appointment.reason?.length > 50 && '...'}
                          </small>
                        </Col>
                        <Col md={3}>
                          <Badge bg={getStatusVariant(appointment.status)}>
                            {appointment.status}
                          </Badge>
                        </Col>
                        <Col md={2} className="text-end">
                          <Link to={`/appointments`}>
                            <Button variant="outline-primary" size="sm">
                              View
                            </Button>
                          </Link>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Recent Messages</h5>
                <Link to="/messages">
                  <Button variant="outline-primary" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {stats.recentMessages.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>No messages found</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {stats.recentMessages.map((message) => (
                    <div key={message._id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-semibold small">
                            {message.from?.profile?.firstName} {message.from?.profile?.lastName}
                          </div>
                          <div className="text-muted small">
                            {message.subject?.substring(0, 30)}
                            {message.subject?.length > 30 && '...'}
                          </div>
                        </div>
                        <small className="text-muted">
                          {format(new Date(message.createdAt), 'MMM dd')}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {user.role === 'patient' && (
        <Row>
          <Col>
            <Card className="border-0 shadow-sm bg-primary text-white">
              <Card.Body className="text-center py-4">
                <h5 className="mb-3">Need to schedule an appointment?</h5>
                <Link to="/appointments/book">
                  <Button variant="light" size="lg">
                    Book Appointment
                  </Button>
                </Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Dashboard;