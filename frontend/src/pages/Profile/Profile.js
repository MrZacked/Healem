import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../services/api';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    profile: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      specialization: '',
      department: '',
      licenseNumber: ''
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        profile: {
          firstName: user.profile?.firstName || '',
          lastName: user.profile?.lastName || '',
          phone: user.profile?.phone || '',
          dateOfBirth: user.profile?.dateOfBirth ? 
            new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
          address: {
            street: user.profile?.address?.street || '',
            city: user.profile?.address?.city || '',
            state: user.profile?.address?.state || '',
            zipCode: user.profile?.address?.zipCode || '',
            country: user.profile?.address?.country || 'USA'
          },
          specialization: user.profile?.specialization || '',
          department: user.profile?.department || '',
          licenseNumber: user.profile?.licenseNumber || ''
        }
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [parent]: {
            ...prev.profile[parent],
            [child]: value
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [name]: value
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await usersAPI.updateProfile(user._id, formData);
      updateUser(response.data.user);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      profile: {
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phone: user.profile?.phone || '',
        dateOfBirth: user.profile?.dateOfBirth ? 
          new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
        address: {
          street: user.profile?.address?.street || '',
          city: user.profile?.address?.city || '',
          state: user.profile?.address?.state || '',
          zipCode: user.profile?.address?.zipCode || '',
          country: user.profile?.address?.country || 'USA'
        },
        specialization: user.profile?.specialization || '',
        department: user.profile?.department || '',
        licenseNumber: user.profile?.licenseNumber || ''
      }
    });
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
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h3 className="mb-0">My Profile</h3>
              {!editing ? (
                <Button variant="outline-primary" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    className="me-2"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Save Changes'}
                  </Button>
                </div>
              )}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.profile.firstName}
                        onChange={handleInputChange}
                        disabled={!editing}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.profile.lastName}
                        onChange={handleInputChange}
                        disabled={!editing}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        Email cannot be changed. Contact administrator if needed.
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.profile.phone}
                        onChange={handleInputChange}
                        disabled={!editing}
                        placeholder="1234567890"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Date of Birth</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.profile.dateOfBirth}
                        onChange={handleInputChange}
                        disabled={!editing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Role</Form.Label>
                      <Form.Control
                        type="text"
                        value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        disabled
                        className="bg-light"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Card className="mb-3">
                  <Card.Header>
                    <h5 className="mb-0">Address Information</h5>
                  </Card.Header>
                  <Card.Body>
                    <Row className="mb-3">
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Street Address</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.street"
                            value={formData.profile.address.street}
                            onChange={handleInputChange}
                            disabled={!editing}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>City</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.city"
                            value={formData.profile.address.city}
                            onChange={handleInputChange}
                            disabled={!editing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>State</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.state"
                            value={formData.profile.address.state}
                            onChange={handleInputChange}
                            disabled={!editing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label>ZIP Code</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.zipCode"
                            value={formData.profile.address.zipCode}
                            onChange={handleInputChange}
                            disabled={!editing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label>Country</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.country"
                            value={formData.profile.address.country}
                            onChange={handleInputChange}
                            disabled={!editing}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {(user.role === 'doctor' || user.role === 'nurse') && (
                  <Card className="mb-3">
                    <Card.Header>
                      <h5 className="mb-0">Professional Information</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Department</Form.Label>
                            <Form.Control
                              type="text"
                              name="department"
                              value={formData.profile.department}
                              onChange={handleInputChange}
                              disabled={!editing}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>License Number</Form.Label>
                            <Form.Control
                              type="text"
                              name="licenseNumber"
                              value={formData.profile.licenseNumber}
                              onChange={handleInputChange}
                              disabled={!editing}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      {user.role === 'doctor' && (
                        <Row>
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label>Specialization</Form.Label>
                              <Form.Control
                                type="text"
                                name="specialization"
                                value={formData.profile.specialization}
                                onChange={handleInputChange}
                                disabled={!editing}
                              />
                            </Form.Group>
                          </Col>
                        </Row>
                      )}
                    </Card.Body>
                  </Card>
                )}

                <div className="text-muted small">
                  <strong>Account Details:</strong><br />
                  Username: {user.username}<br />
                  Account Created: {new Date(user.createdAt).toLocaleDateString()}<br />
                  Last Updated: {new Date(user.updatedAt).toLocaleDateString()}
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;