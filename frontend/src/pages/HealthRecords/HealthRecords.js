import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { healthRecordsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const HealthRecords = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    recordType: '',
    patientId: '',
    page: 1,
    limit: 10
  });

  const recordTypes = [
    'diagnosis', 'treatment', 'lab_result', 'vital_signs', 
    'prescription', 'procedure', 'imaging', 'consultation'
  ];

  const recordTypeLabels = {
    diagnosis: 'Diagnosis',
    treatment: 'Treatment',
    lab_result: 'Lab Result',
    vital_signs: 'Vital Signs',
    prescription: 'Prescription',
    procedure: 'Procedure',
    imaging: 'Imaging',
    consultation: 'Consultation'
  };

  const recordTypeColors = {
    diagnosis: 'primary',
    treatment: 'success',
    lab_result: 'info',
    vital_signs: 'warning',
    prescription: 'secondary',
    procedure: 'danger',
    imaging: 'dark',
    consultation: 'light'
  };

  useEffect(() => {
    fetchRecords();
  }, [filters]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let response;
      
      if (user.role === 'patient') {
        response = await healthRecordsAPI.getMyRecords(filters);
      } else {
        response = await healthRecordsAPI.getAllRecords(filters);
      }
      
      setRecords(response.data.records);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching health records:', error);
      toast.error('Failed to fetch health records');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecord = async (recordId) => {
    try {
      const response = await healthRecordsAPI.getRecord(recordId);
      setSelectedRecord(response.data.record);
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching record details:', error);
      toast.error('Failed to fetch record details');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const renderPagination = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null;

    const items = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === pagination.currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    return (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.Prev 
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(pagination.currentPage - 1)}
          />
          {items}
          <Pagination.Next 
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(pagination.currentPage + 1)}
          />
        </Pagination>
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const RecordDetailsModal = () => (
    <Modal 
      show={showModal} 
      onHide={() => setShowModal(false)} 
      size="lg"
      className={isDarkMode ? 'modal-dark' : ''}
    >
      <Modal.Header closeButton className="medical-card">
        <Modal.Title>
          <Badge bg={recordTypeColors[selectedRecord?.recordType] || 'secondary'} className="me-2">
            {recordTypeLabels[selectedRecord?.recordType] || selectedRecord?.recordType}
          </Badge>
          {selectedRecord?.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="medical-card">
        {selectedRecord && (
          <>
            <Row className="mb-3">
              <Col md={6}>
                <strong>Patient:</strong> {selectedRecord.patient?.profile?.firstName} {selectedRecord.patient?.profile?.lastName}
              </Col>
              <Col md={6}>
                <strong>Provider:</strong> {selectedRecord.provider?.profile?.firstName} {selectedRecord.provider?.profile?.lastName}
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <strong>Date:</strong> {formatDate(selectedRecord.recordDate)}
              </Col>
              <Col md={6}>
                <strong>Priority:</strong> 
                <Badge bg={selectedRecord.priority === 'high' ? 'danger' : selectedRecord.priority === 'medium' ? 'warning' : 'success'} className="ms-2">
                  {selectedRecord.priority}
                </Badge>
              </Col>
            </Row>

            <div className="mb-3">
              <strong>Description:</strong>
              <p className="mt-2">{selectedRecord.description}</p>
            </div>

            {selectedRecord.clinicalData && Object.keys(selectedRecord.clinicalData).length > 0 && (
              <div className="mb-3">
                <strong>Clinical Data:</strong>
                <pre className="mt-2 p-3 bg-light rounded">{JSON.stringify(selectedRecord.clinicalData, null, 2)}</pre>
              </div>
            )}

            {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
              <div className="mb-3">
                <strong>Attachments:</strong>
                <ul className="mt-2">
                  {selectedRecord.attachments.map((attachment, index) => (
                    <li key={index}>{attachment.filename} ({attachment.fileType})</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedRecord.tags && selectedRecord.tags.length > 0 && (
              <div className="mb-3">
                <strong>Tags:</strong>
                <div className="mt-2">
                  {selectedRecord.tags.map((tag, index) => (
                    <Badge key={index} bg="secondary" className="me-2">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="text-muted small">
              Created: {formatDate(selectedRecord.createdAt)}
              {selectedRecord.updatedAt !== selectedRecord.createdAt && (
                <> | Updated: {formatDate(selectedRecord.updatedAt)}</>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="medical-card">
        <Button variant="secondary" onClick={() => setShowModal(false)}>
          Close
        </Button>
        {(user.role === 'admin' || user._id === selectedRecord?.provider?._id) && (
          <Button variant="primary">
            Edit Record
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Health Records</h2>
            {user.role !== 'patient' && (
              <Button 
                variant="primary" 
                className="btn-medical btn-medical-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Add New Record
              </Button>
            )}
          </div>

          <Card className="medical-card mb-4">
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-medical">Record Type</Form.Label>
                    <Form.Select
                      className="form-control-medical"
                      value={filters.recordType}
                      onChange={(e) => handleFilterChange('recordType', e.target.value)}
                    >
                      <option value="">All Types</option>
                      {recordTypes.map(type => (
                        <option key={type} value={type}>{recordTypeLabels[type]}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                {user.role !== 'patient' && (
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="form-label-medical">Patient ID</Form.Label>
                      <Form.Control
                        className="form-control-medical"
                        type="text"
                        placeholder="Enter patient ID"
                        value={filters.patientId}
                        onChange={(e) => handleFilterChange('patientId', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                )}
                
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="form-label-medical">Records per page</Form.Label>
                    <Form.Select
                      className="form-control-medical"
                      value={filters.limit}
                      onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-medical mx-auto mb-3"></div>
              <p>Loading health records...</p>
            </div>
          ) : records.length === 0 ? (
            <Alert variant="info" className="text-center">
              No health records found matching your criteria.
            </Alert>
          ) : (
            <Card className="medical-card">
              <Card.Body className="p-0">
                <Table responsive hover className="table-medical mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Patient</th>
                      <th>Provider</th>
                      <th>Date</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record._id}>
                        <td>
                          <Badge bg={recordTypeColors[record.recordType] || 'secondary'}>
                            {recordTypeLabels[record.recordType] || record.recordType}
                          </Badge>
                        </td>
                        <td>
                          <strong>{record.title}</strong>
                          {record.description && (
                            <div className="text-muted small mt-1">
                              {record.description.substring(0, 100)}...
                            </div>
                          )}
                        </td>
                        <td>{record.patient?.profile?.firstName} {record.patient?.profile?.lastName}</td>
                        <td>{record.provider?.profile?.firstName} {record.provider?.profile?.lastName}</td>
                        <td>{formatDate(record.recordDate)}</td>
                        <td>
                          <Badge bg={record.priority === 'high' ? 'danger' : record.priority === 'medium' ? 'warning' : 'success'}>
                            {record.priority}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="btn-medical"
                            onClick={() => handleViewRecord(record._id)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {renderPagination()}
        </Col>
      </Row>

      <RecordDetailsModal />
    </Container>
  );
};

export default HealthRecords;