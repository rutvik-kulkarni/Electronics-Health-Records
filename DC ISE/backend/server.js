const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HBASE_REST_URL = process.env.HBASE_REST_URL || 'http://hbase-rest:8080';

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for development
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

console.log('🏥 EHR Backend Server Starting...');
console.log('📊 HBase REST URL:', HBASE_REST_URL);

// Helper functions for Base64 encoding/decoding
const encodeBase64 = (str) => Buffer.from(String(str)).toString('base64');
const decodeBase64 = (str) => {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (error) {
        console.error('Base64 decode error:', error.message);
        return '';
    }
};

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        hbase_url: HBASE_REST_URL,
        uptime: process.uptime() 
    });
});

// Test HBase connectivity
app.get('/api/test-hbase', async (req, res) => {
    try {
        const response = await axios.get(`${HBASE_REST_URL}/version/cluster`, {
            headers: { 'Accept': 'application/json' },
            timeout: 5000
        });

        res.json({ 
            success: true, 
            hbase_status: 'connected',
            cluster_info: response.data 
        });
    } catch (error) {
        console.error('HBase connection test failed:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'HBase connection failed',
            details: error.message 
        });
    }
});

// Initialize HBase tables for EHR data
app.post('/api/init-tables', async (req, res) => {
    try {
        const tables = [
            {
                name: 'patient_demographics',
                families: ['personal_info', 'contact_info', 'emergency_contact']
            },
            {
                name: 'medical_history',
                families: ['conditions', 'timeline', 'severity']
            },
            {
                name: 'prescriptions',
                families: ['medications', 'dosage_info', 'prescriber_info']
            },
            {
                name: 'lab_reports',
                families: ['test_results', 'orders', 'values']
            },
            {
                name: 'patient_visits',
                families: ['visit_details', 'diagnosis', 'treatment']
            }
        ];

        const results = [];

        for (const table of tables) {
            try {
                const schema = {
                    name: table.name,
                    ColumnSchema: table.families.map(family => ({ name: family }))
                };

                await axios.put(`${HBASE_REST_URL}/${table.name}/schema`, schema, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                });

                console.log(`✅ Created/Updated table: ${table.name}`);
                results.push({ table: table.name, status: 'created', families: table.families });

            } catch (error) {
                if (error.response && error.response.status === 409) {
                    console.log(`ℹ️  Table ${table.name} already exists`);
                    results.push({ table: table.name, status: 'exists', families: table.families });
                } else {
                    console.error(`❌ Failed to create table ${table.name}:`, error.message);
                    results.push({ table: table.name, status: 'error', error: error.message });
                }
            }
        }

        res.json({ 
            success: true, 
            message: 'HBase tables initialization completed',
            results: results 
        });

    } catch (error) {
        console.error('Error initializing tables:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to initialize tables',
            details: error.message 
        });
    }
});

// Get all patients with basic demographics
app.get('/api/patients', async (req, res) => {
    try {
        const response = await axios.get(`${HBASE_REST_URL}/patient_demographics/*`, {
            headers: { 'Accept': 'application/json' },
            timeout: 10000
        });

        const patients = [];

        if (response.data && response.data.Row) {
            for (const row of response.data.Row) {
                try {
                    const patientId = decodeBase64(row.key);
                    const demographics = parseCellData(row.Cell);

                    patients.push({
                        patient_id: patientId,
                        first_name: demographics.personal_info?.first_name || '',
                        last_name: demographics.personal_info?.last_name || '',
                        age: demographics.personal_info?.age || '',
                        gender: demographics.personal_info?.gender || '',
                        phone: demographics.contact_info?.phone || '',
                        email: demographics.contact_info?.email || ''
                    });
                } catch (parseError) {
                    console.error('Error parsing patient row:', parseError.message);
                }
            }
        }

        res.json({
            success: true,
            count: patients.length,
            patients: patients
        });

    } catch (error) {
        console.error('Error fetching patients:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch patients',
            details: error.message 
        });
    }
});

// Add new patient
app.post('/api/patients', async (req, res) => {
    try {
        const { patient_id, demographics } = req.body;

        if (!patient_id || !demographics) {
            return res.status(400).json({ 
                success: false, 
                error: 'Patient ID and demographics are required' 
            });
        }

        // Prepare cell data for HBase
        const cellData = {
            Row: [{
                key: encodeBase64(patient_id),
                Cell: []
            }]
        };

        // Personal information
        const personalFields = ['first_name', 'last_name', 'date_of_birth', 'age', 'gender', 'blood_type'];
        personalFields.forEach(field => {
            if (demographics[field]) {
                cellData.Row[0].Cell.push({
                    column: encodeBase64(`personal_info:${field}`),
                    $: encodeBase64(String(demographics[field]))
                });
            }
        });

        // Contact information
        const contactFields = ['phone', 'email', 'address'];
        contactFields.forEach(field => {
            if (demographics[field]) {
                cellData.Row[0].Cell.push({
                    column: encodeBase64(`contact_info:${field}`),
                    $: encodeBase64(String(demographics[field]))
                });
            }
        });

        // Emergency contact
        if (demographics.emergency_contact) {
            Object.keys(demographics.emergency_contact).forEach(field => {
                cellData.Row[0].Cell.push({
                    column: encodeBase64(`emergency_contact:${field}`),
                    $: encodeBase64(String(demographics.emergency_contact[field]))
                });
            });
        }

        // Insert into HBase
        await axios.put(
            `${HBASE_REST_URL}/patient_demographics/${encodeBase64(patient_id)}`,
            cellData,
            { 
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            }
        );

        console.log(`✅ Added new patient: ${patient_id}`);

        res.json({ 
            success: true, 
            patient_id: patient_id,
            message: 'Patient added successfully' 
        });

    } catch (error) {
        console.error('Error adding patient:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to add patient',
            details: error.message 
        });
    }
});

// Get patient by ID with complete medical record
app.get('/api/patients/:id', async (req, res) => {
    try {
        const patientId = req.params.id;

        console.log(`🔍 Fetching complete record for patient: ${patientId}`);

        // Fetch data from all tables in parallel
        const [demographics, medicalHistory, prescriptions, labReports, visits] = await Promise.all([
            fetchPatientDemographics(patientId),
            fetchMedicalHistory(patientId),
            fetchPrescriptions(patientId),
            fetchLabReports(patientId),
            fetchPatientVisits(patientId)
        ]);

        const patientRecord = {
            patient_id: patientId,
            demographics: demographics || {},
            medical_history: medicalHistory || [],
            prescriptions: prescriptions || [],
            lab_reports: labReports || [],
            visits: visits || []
        };

        res.json({
            success: true,
            patient: patientRecord
        });

    } catch (error) {
        console.error('Error fetching patient record:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch patient record',
            details: error.message 
        });
    }
});

// Add medical condition to patient
app.post('/api/patients/:id/medical-history', async (req, res) => {
    try {
        const patientId = req.params.id;
        const { condition, diagnosed_date, status, severity, notes } = req.body;

        if (!condition || !diagnosed_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Condition and diagnosed_date are required' 
            });
        }

        const conditionKey = `${patientId}_${Date.now()}`; // Unique key for each condition

        const cellData = {
            Row: [{
                key: encodeBase64(conditionKey),
                Cell: [
                    {
                        column: encodeBase64('conditions:patient_id'),
                        $: encodeBase64(patientId)
                    },
                    {
                        column: encodeBase64('conditions:condition'),
                        $: encodeBase64(condition)
                    },
                    {
                        column: encodeBase64('timeline:diagnosed_date'),
                        $: encodeBase64(diagnosed_date)
                    },
                    {
                        column: encodeBase64('conditions:status'),
                        $: encodeBase64(status || 'Active')
                    },
                    {
                        column: encodeBase64('severity:level'),
                        $: encodeBase64(severity || 'Unknown')
                    }
                ]
            }]
        };

        if (notes) {
            cellData.Row[0].Cell.push({
                column: encodeBase64('conditions:notes'),
                $: encodeBase64(notes)
            });
        }

        await axios.put(
            `${HBASE_REST_URL}/medical_history/${encodeBase64(conditionKey)}`,
            cellData,
            { headers: { 'Content-Type': 'application/json' } }
        );

        res.json({ 
            success: true, 
            message: 'Medical condition added successfully' 
        });

    } catch (error) {
        console.error('Error adding medical condition:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to add medical condition',
            details: error.message 
        });
    }
});

// Add prescription to patient
app.post('/api/patients/:id/prescriptions', async (req, res) => {
    try {
        const patientId = req.params.id;
        const { medication, dosage, frequency, prescribed_date, prescribing_doctor, status } = req.body;

        if (!medication || !dosage) {
            return res.status(400).json({ 
                success: false, 
                error: 'Medication and dosage are required' 
            });
        }

        const prescriptionKey = `${patientId}_${Date.now()}`;

        const cellData = {
            Row: [{
                key: encodeBase64(prescriptionKey),
                Cell: [
                    {
                        column: encodeBase64('medications:patient_id'),
                        $: encodeBase64(patientId)
                    },
                    {
                        column: encodeBase64('medications:medication'),
                        $: encodeBase64(medication)
                    },
                    {
                        column: encodeBase64('dosage_info:dosage'),
                        $: encodeBase64(dosage)
                    },
                    {
                        column: encodeBase64('dosage_info:frequency'),
                        $: encodeBase64(frequency || 'As needed')
                    },
                    {
                        column: encodeBase64('prescriber_info:prescribed_date'),
                        $: encodeBase64(prescribed_date || new Date().toISOString().split('T')[0])
                    },
                    {
                        column: encodeBase64('prescriber_info:doctor'),
                        $: encodeBase64(prescribing_doctor || 'Unknown')
                    },
                    {
                        column: encodeBase64('medications:status'),
                        $: encodeBase64(status || 'Active')
                    }
                ]
            }]
        };

        await axios.put(
            `${HBASE_REST_URL}/prescriptions/${encodeBase64(prescriptionKey)}`,
            cellData,
            { headers: { 'Content-Type': 'application/json' } }
        );

        res.json({ 
            success: true, 
            message: 'Prescription added successfully' 
        });

    } catch (error) {
        console.error('Error adding prescription:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to add prescription',
            details: error.message 
        });
    }
});

// Add lab report for patient
app.post('/api/patients/:id/lab-reports', async (req, res) => {
    try {
        const patientId = req.params.id;
        const { test_date, test_type, results, ordered_by } = req.body;

        if (!test_type || !results) {
            return res.status(400).json({ 
                success: false, 
                error: 'Test type and results are required' 
            });
        }

        const reportKey = `${patientId}_${Date.now()}`;

        const cellData = {
            Row: [{
                key: encodeBase64(reportKey),
                Cell: [
                    {
                        column: encodeBase64('orders:patient_id'),
                        $: encodeBase64(patientId)
                    },
                    {
                        column: encodeBase64('orders:test_date'),
                        $: encodeBase64(test_date || new Date().toISOString().split('T')[0])
                    },
                    {
                        column: encodeBase64('orders:test_type'),
                        $: encodeBase64(test_type)
                    },
                    {
                        column: encodeBase64('orders:ordered_by'),
                        $: encodeBase64(ordered_by || 'Unknown')
                    }
                ]
            }]
        };

        // Add test results
        if (typeof results === 'object') {
            Object.keys(results).forEach(testName => {
                cellData.Row[0].Cell.push({
                    column: encodeBase64(`test_results:${testName}`),
                    $: encodeBase64(String(results[testName]))
                });
            });
        } else {
            cellData.Row[0].Cell.push({
                column: encodeBase64('test_results:result'),
                $: encodeBase64(String(results))
            });
        }

        await axios.put(
            `${HBASE_REST_URL}/lab_reports/${encodeBase64(reportKey)}`,
            cellData,
            { headers: { 'Content-Type': 'application/json' } }
        );

        res.json({ 
            success: true, 
            message: 'Lab report added successfully' 
        });

    } catch (error) {
        console.error('Error adding lab report:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to add lab report',
            details: error.message 
        });
    }
});

// Helper functions for data fetching
async function fetchPatientDemographics(patientId) {
    try {
        const response = await axios.get(
            `${HBASE_REST_URL}/patient_demographics/${encodeBase64(patientId)}`,
            { headers: { 'Accept': 'application/json' } }
        );

        if (response.data && response.data.Row && response.data.Row[0]) {
            return parseCellData(response.data.Row[0].Cell);
        }
        return null;
    } catch (error) {
        console.error(`Error fetching demographics for ${patientId}:`, error.message);
        return null;
    }
}

async function fetchMedicalHistory(patientId) {
    try {
        const response = await axios.get(
            `${HBASE_REST_URL}/medical_history/*`,
            { headers: { 'Accept': 'application/json' } }
        );

        const history = [];
        if (response.data && response.data.Row) {
            for (const row of response.data.Row) {
                const data = parseCellData(row.Cell);
                if (data.conditions?.patient_id === patientId) {
                    history.push({
                        condition: data.conditions?.condition,
                        diagnosed_date: data.timeline?.diagnosed_date,
                        status: data.conditions?.status,
                        severity: data.severity?.level,
                        notes: data.conditions?.notes
                    });
                }
            }
        }
        return history;
    } catch (error) {
        console.error(`Error fetching medical history for ${patientId}:`, error.message);
        return [];
    }
}

async function fetchPrescriptions(patientId) {
    try {
        const response = await axios.get(
            `${HBASE_REST_URL}/prescriptions/*`,
            { headers: { 'Accept': 'application/json' } }
        );

        const prescriptions = [];
        if (response.data && response.data.Row) {
            for (const row of response.data.Row) {
                const data = parseCellData(row.Cell);
                if (data.medications?.patient_id === patientId) {
                    prescriptions.push({
                        medication: data.medications?.medication,
                        dosage: data.dosage_info?.dosage,
                        frequency: data.dosage_info?.frequency,
                        prescribed_date: data.prescriber_info?.prescribed_date,
                        prescribing_doctor: data.prescriber_info?.doctor,
                        status: data.medications?.status
                    });
                }
            }
        }
        return prescriptions;
    } catch (error) {
        console.error(`Error fetching prescriptions for ${patientId}:`, error.message);
        return [];
    }
}

async function fetchLabReports(patientId) {
    try {
        const response = await axios.get(
            `${HBASE_REST_URL}/lab_reports/*`,
            { headers: { 'Accept': 'application/json' } }
        );

        const reports = [];
        if (response.data && response.data.Row) {
            for (const row of response.data.Row) {
                const data = parseCellData(row.Cell);
                if (data.orders?.patient_id === patientId) {
                    // Extract test results
                    const results = {};
                    Object.keys(data).forEach(family => {
                        if (family === 'test_results') {
                            Object.assign(results, data[family]);
                        }
                    });

                    reports.push({
                        test_date: data.orders?.test_date,
                        test_type: data.orders?.test_type,
                        results: results,
                        ordered_by: data.orders?.ordered_by
                    });
                }
            }
        }
        return reports;
    } catch (error) {
        console.error(`Error fetching lab reports for ${patientId}:`, error.message);
        return [];
    }
}

async function fetchPatientVisits(patientId) {
    // Implementation for patient visits - similar pattern as above
    return [];
}

// Helper function to parse HBase cell data
function parseCellData(cells) {
    const data = {};
    if (!cells) return data;

    cells.forEach(cell => {
        try {
            const column = decodeBase64(cell.column);
            const value = decodeBase64(cell.$);

            const [family, qualifier] = column.split(':');
            if (!data[family]) data[family] = {};
            data[family][qualifier] = value;
        } catch (error) {
            console.error('Error parsing cell data:', error.message);
        }
    });

    return data;
}

// Sample data endpoints for quick testing
app.get('/api/sample-data', (req, res) => {
    const samplePatients = [
        {
            patient_id: 'PAT_001',
            demographics: {
                first_name: 'John',
                last_name: 'Smith',
                date_of_birth: '1985-03-15',
                age: 38,
                gender: 'Male',
                blood_type: 'A+',
                phone: '555-0123',
                email: 'john.smith@email.com',
                address: '123 Main Street, Austin, TX',
                emergency_contact: {
                    name: 'Jane Smith',
                    relationship: 'Spouse',
                    phone: '555-0124'
                }
            }
        },
        {
            patient_id: 'PAT_002', 
            demographics: {
                first_name: 'Sarah',
                last_name: 'Johnson',
                date_of_birth: '1992-07-20',
                age: 31,
                gender: 'Female',
                blood_type: 'O-',
                phone: '555-0234',
                email: 'sarah.johnson@email.com',
                address: '456 Oak Avenue, Dallas, TX',
                emergency_contact: {
                    name: 'Michael Johnson',
                    relationship: 'Husband',
                    phone: '555-0235'
                }
            }
        }
    ];

    res.json({ sample_patients: samplePatients });
});

// Load sample data into HBase
app.post('/api/load-sample-data', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3000/api/sample-data');
        const samplePatients = response.data.sample_patients;

        const results = [];

        for (const patient of samplePatients) {
            try {
                const addResponse = await axios.post('http://localhost:3000/api/patients', patient);
                results.push({ patient_id: patient.patient_id, status: 'added' });
                console.log(`✅ Loaded sample patient: ${patient.patient_id}`);
            } catch (error) {
                results.push({ patient_id: patient.patient_id, status: 'error', error: error.message });
                console.error(`❌ Failed to load patient ${patient.patient_id}:`, error.message);
            }
        }

        res.json({ 
            success: true, 
            message: 'Sample data loading completed',
            results: results 
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load sample data',
            details: error.message 
        });
    }
});

// Serve frontend for any non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        details: error.message 
    });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🏥 ===============================================');
    console.log('   EHR Backend Server Successfully Started!');
    console.log('🏥 ===============================================');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`📊 HBase REST API: ${HBASE_REST_URL}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`👥 Patients API: http://localhost:${PORT}/api/patients`);
    console.log(`🧪 Test HBase: http://localhost:${PORT}/api/test-hbase`);
    console.log('🏥 ===============================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('🏥 EHR Backend Server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('🏥 EHR Backend Server closed.');
        process.exit(0);
    });
});

module.exports = app;
