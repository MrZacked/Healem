import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Form, Button, Alert, 
  Spinner, ListGroup, Badge 
} from 'react-bootstrap';
import Calendar from 'react-calendar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, appointmentsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';

const BookAppointment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [formData, setFormData] = useState({
    doctor: '',
    appointmentDate: null,
    timeSlot: { start: '', end: '' },
    reason: '',
    type: 'consultation',
    priority: 'medium'
  });

  useEffect(() => {
    if (user?.role !== 'patient') {
      navigate('/dashboard');
      return;
    }
    fetchDoctors();
  }, [user, navigate]);

  useEffect(() => {
    if (formData.doctor && formData.appointmentDate) {
      fetchAvailableSlots();
    }
  }, [formData.doctor, formData.appointmentDate]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getDoctors({ limit: 50 });
      setDoctors(response.data.doctors);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch doctors';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      const dateString = format(formData.appointmentDate, 'yyyy-MM-dd');
      const response = await appointmentsAPI.getDoctorAvailability(formData.doctor, dateString);
      setAvailableSlots(response.data.availableSlots);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch availability';
      toast.error(message);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctorId) => {
    setFormData(prev => ({ 
      ...prev, 
      doctor: doctorId,
      appointmentDate: null,
      timeSlot: { start: '', end: '' }
    }));
    setStep(2);
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ 
      ...prev, 
      appointmentDate: date,
      timeSlot: { start: '', end: '' }
    }));
    setStep(3);
  };

  const handleTimeSlotSelect = (startTime) => {
    const endTime = getEndTime(startTime);
    setFormData(prev => ({ 
      ...prev, 
      timeSlot: { start: startTime, end: endTime }
    }));
    setStep(4);
  };

  const getEndTime = (startTime) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for your appointment');
      return;
    }

    try {
      setLoading(true);
      await appointmentsAPI.createAppointment({
        doctor: formData.doctor,
        appointmentDate: formData.appointmentDate.toISOString(),
        timeSlot: formData.timeSlot,
        reason: formData.reason.trim(),
        type: formData.type,
        priority: formData.priority
      });

      toast.success('Appointment booked successfully!');
      navigate('/appointments');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to book appointment';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date) => {
    const today = startOfDay(new Date());
    return isBefore(date, today) || isWeekend(date);
  };

  const getSelectedDoctor = () => {
    return doctors.find(doc => doc._id === formData.doctor);
  };

  const resetForm = () => {
    setFormData({
      doctor: '',
      appointmentDate: null,
      timeSlot: { start: '', end: '' },
      reason: '',
      type: 'consultation',
      priority: 'medium'
    });
    setStep(1);
    setAvailableSlots([]);
  };

  if (!user || user.role !== 'patient') {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          Only patients can book appointments.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h3 className="mb-0">Book New Appointment</h3>
              <div className="mt-2">
                <div className="d-flex">
                  {[1, 2, 3, 4].map((stepNum) => (
                    <div
                      key={stepNum}
                      className={`flex-fill text-center ${
                        step >= stepNum ? 'text-primary' : 'text-muted'
                      }`}
                    >
                      <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                        step >= stepNum ? 'bg-primary text-white' : 'bg-light'
                      }`} style={{ width: '30px', height: '30px', fontSize: '14px' }}>
                        {stepNum}
                      </div>
                      <div className="small mt-1">
                        {stepNum === 1 && 'Doctor'}
                        {stepNum === 2 && 'Date'}
                        {stepNum === 3 && 'Time'}
                        {stepNum === 4 && 'Details'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {step === 1 && (
                <div>
                  <h5 className="mb-3">Select a Doctor</h5>
                  {loading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : doctors.length === 0 ? (
                    <Alert variant="info">No doctors available at this time.</Alert>
                  ) : (
                    <ListGroup>
                      {doctors.map((doctor) => (
                        <ListGroup.Item
                          key={doctor._id}
                          action
                          onClick={() => handleDoctorSelect(doctor._id)}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <h6 className="mb-1">
                              Dr. {doctor.profile?.firstName} {doctor.profile?.lastName}
                            </h6>
                            <p className="mb-1 text-muted">
                              {doctor.profile?.specialization}
                            </p>
                            <small className="text-muted">
                              {doctor.profile?.department}
                            </small>
                          </div>
                          <div>
                            <Badge bg="primary">Select</Badge>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Select Date</h5>
                    <Button variant="outline-secondary" size="sm" onClick={() => setStep(1)}>
                      Change Doctor
                    </Button>
                  </div>
                  
                  <div className="mb-3">
                    <strong>Selected Doctor:</strong> Dr. {getSelectedDoctor()?.profile?.firstName} {getSelectedDoctor()?.profile?.lastName}
                  </div>

                  <div className="d-flex justify-content-center">
                    <Calendar
                      onChange={handleDateChange}
                      value={formData.appointmentDate}
                      minDate={new Date()}
                      maxDate={addDays(new Date(), 30)}
                      tileDisabled={({ date }) => isDateDisabled(date)}
                      className="react-calendar"
                    />
                  </div>
                  <div className="text-muted small mt-2 text-center">
                    Weekends are not available for appointments
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Select Time</h5>
                    <Button variant="outline-secondary" size="sm" onClick={() => setStep(2)}>
                      Change Date
                    </Button>
                  </div>

                  <div className="mb-3">
                    <strong>Date:</strong> {format(formData.appointmentDate, 'EEEE, MMMM dd, yyyy')}
                  </div>

                  {loading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <Alert variant="warning">
                      No available time slots for this date. Please select another date.
                    </Alert>
                  ) : (
                    <Row>
                      {availableSlots.map((slot) => (
                        <Col md={4} key={slot} className="mb-2">
                          <Button
                            variant="outline-primary"
                            className="w-100"
                            onClick={() => handleTimeSlotSelect(slot)}
                          >
                            {slot} - {getEndTime(slot)}
                          </Button>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Appointment Details</h5>
                    <Button variant="outline-secondary" size="sm" onClick={() => setStep(3)}>
                      Change Time
                    </Button>
                  </div>

                  <div className="mb-4 p-3 bg-light rounded">
                    <div><strong>Doctor:</strong> Dr. {getSelectedDoctor()?.profile?.firstName} {getSelectedDoctor()?.profile?.lastName}</div>
                    <div><strong>Date:</strong> {format(formData.appointmentDate, 'EEEE, MMMM dd, yyyy')}</div>
                    <div><strong>Time:</strong> {formData.timeSlot.start} - {formData.timeSlot.end}</div>
                  </div>

                  <Form onSubmit={handleSubmit}>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Appointment Type</Form.Label>
                          <Form.Select
                            name="type"
                            value={formData.type}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="consultation">Consultation</option>
                            <option value="follow-up">Follow-up</option>
                            <option value="check-up">Check-up</option>
                            <option value="emergency">Emergency</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Priority</Form.Label>
                          <Form.Select
                            name="priority"
                            value={formData.priority}
                            onChange={handleInputChange}
                            required
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Reason for Visit</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="reason"
                        value={formData.reason}
                        onChange={handleInputChange}
                        placeholder="Please describe the reason for your appointment..."
                        required
                        maxLength={500}
                      />
                      <Form.Text className="text-muted">
                        {formData.reason.length}/500 characters
                      </Form.Text>
                    </Form.Group>

                    <div className="d-flex justify-content-between">
                      <Button variant="outline-secondary" onClick={resetForm}>
                        Start Over
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary"
                        disabled={loading || !formData.reason.trim()}
                      >
                        {loading ? <Spinner animation="border" size="sm" /> : 'Book Appointment'}
                      </Button>
                    </div>
                  </Form>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BookAppointment;