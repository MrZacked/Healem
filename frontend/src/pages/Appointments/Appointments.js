import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Badge, 
  Form, InputGroup, Spinner, Alert, Modal 
} from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    date: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [filters, pagination.current]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current,
        limit: 10,
        ...filters
      };
      
      const response = await appointmentsAPI.getAppointments(params);
      setAppointments(response.data.appointments);
      setPagination(response.data.pagination);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch appointments';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (appointmentId, newStatus, notes = '') => {
    try {
      setActionLoading(true);
      await appointmentsAPI.updateAppointmentStatus(appointmentId, {
        status: newStatus,
        notes
      });
      
      toast.success(`Appointment ${newStatus} successfully`);
      fetchAppointments();
      setShowModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update appointment';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const clearFilters = () => {
    setFilters({ status: '', date: '' });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      confirmed: 'success',
      cancelled: 'danger',
      completed: 'primary',
      'no-show': 'secondary'
    };
    return variants[status] || 'secondary';
  };

  const canUpdateStatus = (appointment) => {
    return user.role === 'admin' || 
           user.role === 'nurse' ||
           (user.role === 'doctor' && appointment.doctor._id === user._id) ||
           (user.role === 'patient' && appointment.patient._id === user._id && 
            appointment.status === 'pending');
  };

  const renderActionButtons = (appointment) => {
    if (!canUpdateStatus(appointment)) return null;

    const buttons = [];

    if (user.role === 'patient' && appointment.status === 'pending') {
      buttons.push(
        <Button
          key="cancel"
          variant="outline-danger"
          size="sm"
          onClick={() => handleStatusUpdate(appointment._id, 'cancelled')}
          disabled={actionLoading}
        >
          Cancel
        </Button>
      );
    }

    if (['doctor', 'nurse', 'admin'].includes(user.role)) {
      if (appointment.status === 'pending') {
        buttons.push(
          <Button
            key="confirm"
            variant="outline-success"
            size="sm"
            className="me-1"
            onClick={() => handleStatusUpdate(appointment._id, 'confirmed')}
            disabled={actionLoading}
          >
            Confirm
          </Button>
        );
      }
      
      if (['pending', 'confirmed'].includes(appointment.status)) {
        buttons.push(
          <Button
            key="cancel-admin"
            variant="outline-danger"
            size="sm"
            className="me-1"
            onClick={() => {
              setSelectedAppointment(appointment);
              setShowModal(true);
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
        );
      }

      if (appointment.status === 'confirmed' && user.role === 'doctor') {
        buttons.push(
          <Button
            key="complete"
            variant="outline-primary"
            size="sm"
            onClick={() => handleStatusUpdate(appointment._id, 'completed')}
            disabled={actionLoading}
          >
            Complete
          </Button>
        );
      }
    }

    return <div className="d-flex gap-1">{buttons}</div>;
  };

  if (!user) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>My Appointments</h2>
            {user.role === 'patient' && (
              <LinkContainer to="/appointments/book">
                <Button variant="primary">Book New Appointment</Button>
              </LinkContainer>
            )}
          </div>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={8}>
          <Card>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filter by Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="no-show">No Show</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filter by Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={filters.date}
                      onChange={handleFilterChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4} className="d-flex align-items-end">
                  <Button variant="outline-secondary" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Body>
              <h6>Quick Stats</h6>
              <div className="text-muted small">
                Total Appointments: {pagination.total}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <div className="mt-2">Loading appointments...</div>
            </div>
          ) : appointments.length === 0 ? (
            <Alert variant="info" className="text-center">
              <h5>No appointments found</h5>
              <p>
                {user.role === 'patient' 
                  ? "You haven't booked any appointments yet."
                  : "No appointments match your current filters."
                }
              </p>
              {user.role === 'patient' && (
                <LinkContainer to="/appointments/book">
                  <Button variant="primary">Book Your First Appointment</Button>
                </LinkContainer>
              )}
            </Alert>
          ) : (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>{user.role === 'patient' ? 'Doctor' : 'Patient'}</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id}>
                      <td>
                        <div>
                          <strong>
                            {format(parseISO(appointment.appointmentDate), 'MMM dd, yyyy')}
                          </strong>
                        </div>
                        <div className="text-muted small">
                          {appointment.timeSlot.start} - {appointment.timeSlot.end}
                        </div>
                      </td>
                      <td>
                        {user.role === 'patient' ? (
                          <div>
                            <div>
                              Dr. {appointment.doctor.profile?.firstName} {appointment.doctor.profile?.lastName}
                            </div>
                            <div className="text-muted small">
                              {appointment.doctor.profile?.specialization}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div>
                              {appointment.patient.profile?.firstName} {appointment.patient.profile?.lastName}
                            </div>
                            <div className="text-muted small">
                              {appointment.patient.profile?.phone}
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge bg="info">
                          {appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg={getStatusVariant(appointment.status)}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }}>
                          {appointment.reason}
                        </div>
                      </td>
                      <td>
                        {renderActionButtons(appointment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {pagination.pages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <div className="d-flex align-items-center">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={pagination.current === 1}
                      onClick={() => setPagination(prev => ({ 
                        ...prev, 
                        current: prev.current - 1 
                      }))}
                    >
                      Previous
                    </Button>
                    <span className="mx-3">
                      Page {pagination.current} of {pagination.pages}
                    </span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      disabled={pagination.current === pagination.pages}
                      onClick={() => setPagination(prev => ({ 
                        ...prev, 
                        current: prev.current + 1 
                      }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to cancel this appointment?</p>
          {selectedAppointment && (
            <div className="bg-light p-3 rounded">
              <strong>
                {format(parseISO(selectedAppointment.appointmentDate), 'MMM dd, yyyy')}
              </strong> at {selectedAppointment.timeSlot.start}<br />
              Patient: {selectedAppointment.patient.profile?.firstName} {selectedAppointment.patient.profile?.lastName}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowModal(false)}
            disabled={actionLoading}
          >
            Keep Appointment
          </Button>
          <Button 
            variant="danger" 
            onClick={() => handleStatusUpdate(selectedAppointment._id, 'cancelled')}
            disabled={actionLoading}
          >
            {actionLoading ? <Spinner animation="border" size="sm" /> : 'Cancel Appointment'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Appointments;