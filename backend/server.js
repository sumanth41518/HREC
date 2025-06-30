const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const port = 3016;

// Middleware
app.use(cors({
    origin: '*', // Allow requests from any origin for mobile access
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database setup - MongoDB
// Replace with your MongoDB Atlas connection string for cloud hosting
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employeesDB';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    heartbeatFrequencyMS: 10000 // Check connection health every 10 seconds
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB:', err.message, err.stack));

// Define MongoDB schemas and models
const employeeSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    position: { type: String, required: true },
    email: { type: String }
});
const Employee = mongoose.model('Employee', employeeSchema);

const messageSchema = new mongoose.Schema({
    employeeId: { type: String, ref: 'Employee' },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const scheduledMessageSchema = new mongoose.Schema({
    recipient_id: { type: String, ref: 'Employee' },
    recipient_email: { type: String },
    subject: { type: String },
    content: { type: String },
    scheduled_time: { type: Date },
    sent: { type: Boolean, default: false }
});
const ScheduledMessage = mongoose.model('ScheduledMessage', scheduledMessageSchema);

const sentMessageSchema = new mongoose.Schema({
    recipient: { type: String },
    subject: { type: String },
    content: { type: String },
    timestamp: { type: Date, default: Date.now }
});
const SentMessage = mongoose.model('SentMessage', sentMessageSchema);

const templateSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Template = mongoose.model('Template', templateSchema);

const timesheetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});
const Timesheet = mongoose.model('Timesheet', timesheetSchema);

const timesheetSubmissionSchema = new mongoose.Schema({
    timesheetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timesheet', required: true },
    employeeId: { type: String, ref: 'Employee', required: true },
    submitted: { type: Boolean, default: false },
    submissionDate: { type: Date },
    filePath: { type: String }
});
const TimesheetSubmission = mongoose.model('TimesheetSubmission', timesheetSubmissionSchema);

  // API Endpoints

 // Use multer for file uploads
const multer = require('multer');
const uploadDir = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const employees = await Employee.find();
        console.log('Fetched employee list:', employees.length, 'employees found');
        res.json(employees);
    } catch (err) {
        console.error('Error fetching employee list:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch employees', details: err.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { id, name, position, email } = req.body;
    console.log('Adding new employee with ID:', id, 'Name:', name, 'Position:', position, 'Email:', email);
    if (!id || !name || !position) {
        return res.status(400).json({ error: 'Missing required fields: id, name, and position are required' });
    }
    try {
        const existingEmployee = await Employee.findOne({ id });
        if (existingEmployee) {
            return res.status(409).json({ error: 'Employee with this ID already exists' });
        }
        const newEmployee = new Employee({ id, name, position, email });
        await newEmployee.save();
        console.log('Successfully added employee with ID:', id);
        res.status(201).json({ id, name, position, email });
    } catch (err) {
        console.error('Error adding employee:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to add employee', details: err.message });
    }
});

app.put('/api/employees/:id', async (req, res) => {
    const { name, position, email } = req.body;
    const id = req.params.id;
    console.log('Updating employee ID:', id, 'with email:', email);
    try {
        const updatedEmployee = await Employee.findOneAndUpdate(
            { id },
            { name, position, email },
            { new: true }
        );
        if (!updatedEmployee) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        res.json(updatedEmployee);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an employee
app.delete('/api/employees/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const deletedEmployee = await Employee.findOneAndDelete({ id });
        if (!deletedEmployee) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Receive employee response (manually or via form)
app.post('/api/responses', async (req, res) => {
    const { employeeId, message } = req.body;
    try {
        const newMessage = new Message({ employeeId, message });
        await newMessage.save();
        res.json({ id: newMessage._id, employeeId, message, timestamp: newMessage.timestamp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Handling email replies via Gmail API or manual input
// This endpoint processes email replies with timesheet attachments
app.post('/api/email-replies', upload.single('attachment'), async (req, res) => {
    const { employeeId, message, replyToEmail, timesheetId } = req.body;
    console.log(`Received email reply from ${replyToEmail} for employee ID: ${employeeId}, Timesheet ID: ${timesheetId || 'Not provided'}`);
    try {
        const newMessage = new Message({ employeeId, message });
        await newMessage.save();

        if (timesheetId && req.file) {
            // Update timesheet submission status
            const submission = await TimesheetSubmission.findOneAndUpdate(
                { timesheetId, employeeId },
                { submitted: true, submissionDate: new Date(), filePath: req.file.path },
                { new: true }
            );
            if (!submission) {
                console.log(`No submission record found for Timesheet ID: ${timesheetId}, Employee ID: ${employeeId}`);
            } else {
                console.log(`Updated submission status for Timesheet ID: ${timesheetId}, Employee ID: ${employeeId}`);
            }
        }

        res.json({ id: newMessage._id, employeeId, message, timestamp: newMessage.timestamp });
    } catch (err) {
        console.error('Error processing email reply:', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

// Note: To fully implement email reply detection, you need to set up Gmail API integration.
// This involves:
// 1. Setting up a Google Cloud Project and enabling Gmail API.
// 2. Configuring OAuth 2.0 credentials for your application.
// 3. Using a library like 'googleapis' to monitor the inbox for replies.
// 4. Parsing the reply content and extracting relevant information.
// 5. Posting the reply data to this endpoint.
// This setup requires user credentials and permissions, which should be handled securely.

// Get messages for an employee
app.get('/api/messages/:employeeId', async (req, res) => {
    const employeeId = req.params.employeeId;
    try {
        const messages = await Message.find({ employeeId }).sort({ timestamp: -1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all messages
app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().populate('employeeId').sort({ timestamp: -1 });
        const formattedMessages = messages.map(msg => ({
            id: msg._id,
            employeeId: msg.employeeId ? msg.employeeId.id : null,
            employeeName: msg.employeeId ? msg.employeeId.name : 'Unknown',
            message: msg.message,
            timestamp: msg.timestamp
        }));
        res.json(formattedMessages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule-message', async (req, res) => {
    const { recipientId, recipientEmail, subject, content, scheduledTime } = req.body;
    if (!recipientId || !recipientEmail || !subject || !content || !scheduledTime) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    try {
        const newScheduledMessage = new ScheduledMessage({
            recipient_id: recipientId,
            recipient_email: recipientEmail,
            subject,
            content,
            scheduled_time: new Date(scheduledTime)
        });
        await newScheduledMessage.save();
        res.json({
            id: newScheduledMessage._id,
            recipientId,
            recipientEmail,
            subject,
            content,
            scheduledTime
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Get all scheduled messages
app.get('/api/scheduled-messages', async (req, res) => {
    try {
        const scheduledMessages = await ScheduledMessage.find().populate('recipient_id').sort({ scheduled_time: 1 });
        const formattedMessages = scheduledMessages.map(msg => ({
            id: msg._id,
            recipient_id: msg.recipient_id ? msg.recipient_id.id : null,
            recipientName: msg.recipient_id ? msg.recipient_id.name : 'Unknown',
            recipient_email: msg.recipient_email,
            subject: msg.subject,
            content: msg.content,
            scheduled_time: msg.scheduled_time,
            sent: msg.sent
        }));
        res.json(formattedMessages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
    try {
        const templates = await Template.find().sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        console.error('Error fetching templates:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch templates', details: err.message });
    }
});

// Add a new template
app.post('/api/templates', async (req, res) => {
    const { name, content } = req.body;
    console.log('Adding new template with name:', name);
    if (!name || !content) {
        return res.status(400).json({ error: 'Missing required fields: name and content are required' });
    }
    try {
        const existingTemplate = await Template.findOne({ name });
        if (existingTemplate) {
            return res.status(409).json({ error: 'Template with this name already exists' });
        }
        const newTemplate = new Template({ name, content });
        await newTemplate.save();
        console.log('Successfully added template with name:', name);
        res.status(201).json({ id: newTemplate._id, name, content, createdAt: newTemplate.createdAt });
    } catch (err) {
        console.error('Error adding template:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to add template', details: err.message });
    }
});

// Update a template
app.put('/api/templates/:id', async (req, res) => {
    const { name, content } = req.body;
    const id = req.params.id;
    console.log('Updating template ID:', id);
    try {
        const updatedTemplate = await Template.findByIdAndUpdate(
            id,
            { name, content },
            { new: true }
        );
        if (!updatedTemplate) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        res.json(updatedTemplate);
    } catch (err) {
        console.error('Error updating template:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to update template', details: err.message });
    }
});

// Delete a template
app.delete('/api/templates/:id', async (req, res) => {
    const id = req.params.id;
    console.log('Deleting template ID:', id);
    try {
        const deletedTemplate = await Template.findByIdAndDelete(id);
        if (!deletedTemplate) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }
        res.json({ message: 'Template deleted successfully' });
    } catch (err) {
        console.error('Error deleting template:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to delete template', details: err.message });
    }
});


app.post('/api/timesheets', upload.single('file'), async (req, res) => {
    const { name } = req.body;
    if (!name || !req.file) {
        return res.status(400).json({ error: 'Missing required fields: name and file are required' });
    }
    try {
        console.log('Attempting to upload timesheet:', name);
        const newTimesheet = new Timesheet({
            name,
            filePath: req.file.path
        });
        await newTimesheet.save();
        console.log('Successfully saved timesheet to MongoDB with ID:', newTimesheet._id);
        res.status(201).json({ id: newTimesheet._id, name, uploadedAt: newTimesheet.uploadedAt });
    } catch (err) {
        console.error('Error uploading timesheet:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to upload timesheet', details: err.message });
    }
});

// Get all timesheets
app.get('/api/timesheets', async (req, res) => {
    try {
        const timesheets = await Timesheet.find().sort({ uploadedAt: -1 });
        res.json(timesheets);
    } catch (err) {
        console.error('Error fetching timesheets:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch timesheets', details: err.message });
    }
});

// Delete a timesheet
app.delete('/api/timesheets/:id', async (req, res) => {
    const id = req.params.id;
    console.log('Deleting timesheet ID:', id);
    try {
        const deletedTimesheet = await Timesheet.findByIdAndDelete(id);
        if (!deletedTimesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        // Optionally, delete associated submission records
        await TimesheetSubmission.deleteMany({ timesheetId: id });
        res.json({ message: 'Timesheet deleted successfully' });
    } catch (err) {
        console.error('Error deleting timesheet:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to delete timesheet', details: err.message });
    }
});

// Distribute timesheet to employees
app.post('/api/timesheets/distribute', async (req, res) => {
    const { timesheetId, employeeIds } = req.body;
    if (!timesheetId || !employeeIds || !Array.isArray(employeeIds)) {
        return res.status(400).json({ error: 'Missing required fields: timesheetId and employeeIds array are required' });
    }
    try {
        const timesheet = await Timesheet.findById(timesheetId);
        if (!timesheet) {
            return res.status(404).json({ error: 'Timesheet not found' });
        }
        const employees = await Employee.find({ id: { $in: employeeIds } });
        if (employees.length === 0) {
            return res.status(404).json({ error: 'No employees found with provided IDs' });
        }

        // Create submission records for tracking
        const submissions = employees.map(employee => ({
            timesheetId: timesheetId,
            employeeId: employee.id,
            submitted: false
        }));
        await TimesheetSubmission.insertMany(submissions);

        // Send emails with a placeholder timesheet attachment
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER || 'lsumanth08@gmail.com',
                pass: process.env.EMAIL_PASS || 'vqsz qcbs pkll rfll'
            }
        });

        let successCount = 0;
        let errorCount = 0;
        for (const employee of employees) {
                let mailOptions = {
                    from: '"Your Company" <lsumanth08@gmail.com>',
                    to: employee.email,
                    subject: `Timesheet: ${timesheet.name} (ID: ${timesheetId})`,
                    text: `Dear ${employee.name},\n\nPlease fill out the attached timesheet named "${timesheet.name}" and reply to this email with the completed file attached. Ensure to include your Employee ID (${employee.id}) in the reply for tracking purposes.`,
                    html: `<p>Dear ${employee.name},</p><p>Please fill out the attached timesheet named "${timesheet.name}" and reply to this email with the completed file attached. Ensure to include your Employee ID (${employee.id}) in the reply for tracking purposes.</p>`,
                    attachments: []
                };

// Attach the actual timesheet file if it exists
if (fs.existsSync(timesheet.filePath)) {
    mailOptions.attachments.push({
        filename: `${timesheet.name}${path.extname(timesheet.filePath)}`,
        path: timesheet.filePath
    });
} else {
    console.log(`Timesheet file not found at ${timesheet.filePath}`);
}

            try {
                let info = await transporter.sendMail(mailOptions);
                console.log(`Timesheet notification sent to ${employee.email}: %s`, info.messageId);
                successCount++;
            } catch (error) {
                console.error(`Error sending timesheet notification to ${employee.email}:`, error);
                errorCount++;
            }
        }

        res.json({ message: `Timesheet notification distributed: ${successCount} successful, ${errorCount} failed` });
    } catch (err) {
        console.error('Error distributing timesheet notification:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to distribute timesheet notification', details: err.message });
    }
});

// Submit timesheet response
app.post('/api/timesheets/submit', upload.single('file'), async (req, res) => {
    const { timesheetId, employeeId } = req.body;
    if (!timesheetId || !employeeId || !req.file) {
        return res.status(400).json({ error: 'Missing required fields: timesheetId, employeeId, and file are required' });
    }
    try {
        const submission = await TimesheetSubmission.findOneAndUpdate(
            { timesheetId, employeeId },
            { submitted: true, submissionDate: new Date(), filePath: req.file.path },
            { new: true }
        );
        if (!submission) {
            return res.status(404).json({ error: 'Submission record not found' });
        }
        res.json({ message: 'Timesheet submitted successfully', submission });
    } catch (err) {
        console.error('Error submitting timesheet:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to submit timesheet', details: err.message });
    }
});

 // Get timesheet submission status
app.get('/api/timesheets/status/:timesheetId', async (req, res) => {
    const timesheetId = req.params.timesheetId;
    try {
        const submissions = await TimesheetSubmission.find({ timesheetId });
        const employeeIds = submissions.map(sub => sub.employeeId);
        const employees = await Employee.find({ id: { $in: employeeIds } });
        const employeeMap = employees.reduce((map, emp) => {
            map[emp.id] = emp;
            return map;
        }, {});
        res.json(submissions.map(sub => ({
            employeeId: sub.employeeId || null,
            employeeName: employeeMap[sub.employeeId] ? employeeMap[sub.employeeId].name : 'Unknown',
            email: employeeMap[sub.employeeId] ? employeeMap[sub.employeeId].email : 'Unknown',
            submitted: sub.submitted,
            submissionDate: sub.submissionDate
        })));
    } catch (err) {
        console.error('Error fetching timesheet status:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch timesheet status', details: err.message });
    }
});

// Get sent messages (recent messages sent to employees)
app.get('/api/sent-messages', async (req, res) => {
    try {
        const sentMessages = await SentMessage.find().sort({ timestamp: -1 });
        const formattedMessages = sentMessages.map(row => ({
            to: row.recipient,
            subject: row.subject,
            text: row.content,
            timestamp: row.timestamp.toISOString()
        }));
        res.json(formattedMessages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/send-email', (req, res) => {
    const { to, subject, text, employeeName, employeeId, employeeEmail, employeePosition } = req.body;
    
    console.log('Received email request:', { to, subject, text, employeeName, employeeId, employeeEmail, employeePosition });
    
    // Replace placeholders with employee data if provided
    let processedText = text;
    if (employeeName) {
        processedText = processedText.replace(/{{employeeName}}/g, employeeName);
        console.log('After replacing employeeName:', processedText);
    }
    if (employeeId) {
        processedText = processedText.replace(/{{employeeId}}/g, employeeId);
        console.log('After replacing employeeId:', processedText);
    }
    if (employeeEmail) {
        processedText = processedText.replace(/{{employeeEmail}}/g, employeeEmail || 'Not provided');
        console.log('After replacing employeeEmail:', processedText);
    }
    if (employeePosition) {
        processedText = processedText.replace(/{{employeePosition}}/g, employeePosition);
        console.log('After replacing employeePosition:', processedText);
    }
    
    // Create a transporter object using Gmail SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER || 'lsumanth08@gmail.com', // Use environment variable or update this
            pass: process.env.EMAIL_PASS || 'vqsz qcbs pkll rfll' // Use environment variable or update this (App Password for Gmail)
        }
    });

    // Setup email data
    let mailOptions = {
        from: '"Your Company" <lsumanth08@gmail.com>', // sender address
        to: to, // list of receivers
        subject: subject || 'Message from Dashboard', // Subject line
        text: processedText, // plain text body
        html: `<p>${processedText}</p>` // html body
    };

    // Log the email credentials being used (without password for security)
    console.log('Attempting to send email with user:', process.env.EMAIL_USER || 'lsumanth08@gmail.com');
    
    // Send mail with defined transport object
    transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Failed to send email', details: error.message });
        }
        console.log('Message sent: %s', info.messageId);
        
        // Store the sent message in the database
        const newSentMessage = new SentMessage({
            recipient: to,
            subject: subject || 'Message from Dashboard',
            content: processedText
        });
        try {
            await newSentMessage.save();
            console.log('Sent message stored in MongoDB');
        } catch (err) {
            console.error('Error storing sent message:', err.message);
        }
        
        res.json({ message: 'Email sent successfully', messageId: info.messageId });
    });
});

// Security Note: It's recommended to store sensitive information like email credentials in environment variables
// To set environment variables on Windows, use:
// set EMAIL_USER=your_email@gmail.com
// set EMAIL_PASS=your_app_password
// Then restart your server to apply these changes.

app.use(express.static(path.join(__dirname, '..'), {
    index: false // Prevent automatic serving of index.html without authentication
}));

// Serve dashboard directly without authentication
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Ensure all routes serve the index.html for frontend routing (if using client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


// Function to check and send scheduled messages
async function checkAndSendScheduledMessages() {
    const now = new Date();
    try {
        const messagesToSend = await ScheduledMessage.find({
            scheduled_time: { $lte: now },
            sent: false
        });
        for (const message of messagesToSend) {
            let transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER || 'lsumanth08@gmail.com',
                    pass: process.env.EMAIL_PASS || 'vqsz qcbs pkll rfll'
                }
            });
            let mailOptions = {
                from: '"Your Company" <lsumanth08@gmail.com>',
                to: message.recipient_email,
                subject: message.subject || 'Scheduled Message',
                text: message.content,
                html: `<p>${message.content}</p>`
            };
            transporter.sendMail(mailOptions, async (error, info) => {
                if (error) {
                    console.error(`Error sending scheduled email to ${message.recipient_email}:`, error);
                } else {
                    console.log(`Scheduled message sent to ${message.recipient_email}: %s`, info.messageId);
                    await ScheduledMessage.findByIdAndUpdate(message._id, { sent: true });
                }
            });
        }
    } catch (err) {
        console.error('Error checking scheduled messages:', err.message);
    }
}

// Check for scheduled messages every minute
setInterval(checkAndSendScheduledMessages, 60000);

// Function to send daily reminders for pending timesheet submissions
async function sendTimesheetReminders() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    try {
        // Get all timesheets with pending submissions
        const submissions = await TimesheetSubmission.find({ submitted: false });
        if (submissions.length === 0) return;

        // Group submissions by timesheetId to avoid duplicate processing
        const timesheetIds = [...new Set(submissions.map(sub => sub.timesheetId))];
        const timesheets = await Timesheet.find({ _id: { $in: timesheetIds } });
        const timesheetMap = timesheets.reduce((map, ts) => {
            map[ts._id.toString()] = ts;
            return map;
        }, {});

        const employeeIds = [...new Set(submissions.map(sub => sub.employeeId))];
        const employees = await Employee.find({ id: { $in: employeeIds } });
        const employeeMap = employees.reduce((map, emp) => {
            map[emp.id] = emp;
            return map;
        }, {});

        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER || 'lsumanth08@gmail.com',
                pass: process.env.EMAIL_PASS || 'vqsz qcbs pkll rfll'
            }
        });

        for (const submission of submissions) {
            const timesheet = timesheetMap[submission.timesheetId.toString()];
            const employee = employeeMap[submission.employeeId];
            if (timesheet && employee && employee.email) {
                let mailOptions = {
                    from: '"Your Company" <lsumanth08@gmail.com>',
                    to: employee.email,
                    subject: `Reminder: Submit Timesheet ${timesheet.name} (ID: ${timesheet._id})`,
                    text: `Dear ${employee.name},\n\nThis is a reminder to submit your timesheet. Please fill out the attached timesheet named "${timesheet.name}" and reply to this email with the completed file attached. Ensure to include your Employee ID (${employee.id}) in the reply for tracking purposes.`,
                    html: `<p>Dear ${employee.name},</p><p>This is a reminder to submit your timesheet. Please fill out the attached timesheet named "${timesheet.name}" and reply to this email with the completed file attached. Ensure to include your Employee ID (${employee.id}) in the reply for tracking purposes.</p>`,
                    attachments: []
                };

                // Attach the actual timesheet file if it exists
                if (fs.existsSync(timesheet.filePath)) {
                    mailOptions.attachments.push({
                        filename: `${timesheet.name}${path.extname(timesheet.filePath)}`,
                        path: timesheet.filePath
                    });
                } else {
                    console.log(`Timesheet file not found at ${timesheet.filePath}`);
                }

                try {
                    let info = await transporter.sendMail(mailOptions);
                    console.log(`Reminder sent to ${employee.email}: %s`, info.messageId);
                } catch (error) {
                    console.error(`Error sending reminder to ${employee.email}:`, error);
                }
            }
        }
    } catch (err) {
        console.error('Error sending timesheet reminders:', err.message, err.stack);
    }
}

// Schedule daily reminders at 9 AM
const cron = require('node-cron');
cron.schedule('0 9 * * *', () => {
    console.log('Running daily timesheet reminders...');
    sendTimesheetReminders();
});

// Gmail API integration for monitoring email replies
const { google } = require('googleapis');

// Function to monitor Gmail inbox for timesheet replies
async function monitorGmailInbox() {
    try {
        // Note: Full implementation requires OAuth2 setup with user credentials
        console.log('Monitoring Gmail inbox for timesheet replies...');
        // Placeholder for Gmail API setup
        // const oauth2Client = new google.auth.OAuth2(
        //     process.env.GOOGLE_CLIENT_ID,
        //     process.env.GOOGLE_CLIENT_SECRET,
        //     process.env.GOOGLE_REDIRECT_URI
        // );
        // oauth2Client.setCredentials({
        //     refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        // });
        // const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        // const res = await gmail.users.messages.list({ userId: 'me', q: 'subject:Timesheet has:attachment' });
        // Process emails and attachments here
        // Example logic to process each email:
        // for (const message of res.data.messages) {
        //     const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
        //     const subject = msg.data.payload.headers.find(h => h.name === 'Subject').value;
        //     const timesheetIdMatch = subject.match(/Timesheet: .* \(ID: (\w+)\)/);
        //     const timesheetId = timesheetIdMatch ? timesheetIdMatch[1] : null;
        //     const from = msg.data.payload.headers.find(h => h.name === 'From').value;
        //     const employee = await Employee.findOne({ email: from });
        //     const employeeId = employee ? employee.id : null;
        //     if (timesheetId && employeeId) {
        //         // Extract attachment
        //         const attachment = msg.data.payload.parts.find(p => p.filename);
        //         if (attachment) {
        //             const attachmentData = await gmail.users.messages.attachments.get({
        //                 userId: 'me',
        //                 messageId: message.id,
        //                 id: attachment.body.attachmentId
        //             });
        //             const fileData = Buffer.from(attachmentData.data.data, 'base64');
        //             const filePath = path.join(uploadDir, `submitted_${Date.now()}_${attachment.filename}`);
        //             fs.writeFileSync(filePath, fileData);
        //             // Update submission status
        //             const submission = await TimesheetSubmission.findOneAndUpdate(
        //                 { timesheetId, employeeId },
        //                 { submitted: true, submissionDate: new Date(), filePath },
        //                 { new: true }
        //             );
        //             console.log(`Processed timesheet submission from ${from} for Timesheet ID: ${timesheetId}`);
        //         }
        //     }
        // }
        console.log('Gmail API integration requires OAuth2 setup with user credentials. This functionality is not fully implemented yet.');
    } catch (err) {
        console.error('Error monitoring Gmail inbox:', err.message, err.stack);
    }
}

// Schedule monitoring of Gmail inbox every 5 minutes (adjust as needed)
cron.schedule('*/5 * * * *', () => {
    console.log('Checking for new timesheet replies...');
    monitorGmailInbox();
});

// Function to send daily reminders for pending timesheet submissions
async function sendTimesheetReminders() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    try {
        // Get all timesheets with pending submissions
        const submissions = await TimesheetSubmission.find({ submitted: false });
        if (submissions.length === 0) return;

        // Group submissions by timesheetId to avoid duplicate processing
        const timesheetIds = [...new Set(submissions.map(sub => sub.timesheetId))];
        const timesheets = await Timesheet.find({ _id: { $in: timesheetIds } });
        const timesheetMap = timesheets.reduce((map, ts) => {
            map[ts._id.toString()] = ts;
            return map;
        }, {});

        const employeeIds = [...new Set(submissions.map(sub => sub.employeeId))];
        const employees = await Employee.find({ id: { $in: employeeIds } });
        const employeeMap = employees.reduce((map, emp) => {
            map[emp.id] = emp;
            return map;
        }, {});

        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER || 'lsumanth08@gmail.com',
                pass: process.env.EMAIL_PASS || 'vqsz qcbs pkll rfll'
            }
        });

        for (const submission of submissions) {
            const timesheet = timesheetMap[submission.timesheetId.toString()];
            const employee = employeeMap[submission.employeeId];
            if (timesheet && employee && employee.email) {
                let mailOptions = {
                    from: '"Your Company" <lsumanth08@gmail.com>',
                    to: employee.email,
                    subject: `Reminder: Submit Timesheet ${timesheet.name} (ID: ${timesheet._id})`,
                    text: `Dear ${employee.name},\n\nThis is a reminder to submit your timesheet. Please fill out the attached timesheet named "${timesheet.name}" and reply to this email with the completed file attached. Ensure to include your Employee ID (${employee.id}) in the reply for tracking purposes.`,
                    html: `<p>Dear ${employee.name},</p><p>This is a reminder to submit your timesheet. Please fill out the attached timesheet named "${timesheet.name}" and reply to this email with the completed file attached. Ensure to include your Employee ID (${employee.id}) in the reply for tracking purposes.</p>`,
                    attachments: []
                };

                // Attach the actual timesheet file if it exists
                if (fs.existsSync(timesheet.filePath)) {
                    mailOptions.attachments.push({
                        filename: `${timesheet.name}${path.extname(timesheet.filePath)}`,
                        path: timesheet.filePath
                    });
                } else {
                    console.log(`Timesheet file not found at ${timesheet.filePath}`);
                }

                try {
                    let info = await transporter.sendMail(mailOptions);
                    console.log(`Reminder sent to ${employee.email}: %s`, info.messageId);
                } catch (error) {
                    console.error(`Error sending reminder to ${employee.email}:`, error);
                }
            }
        }
    } catch (err) {
        console.error('Error sending timesheet reminders:', err.message, err.stack);
    }
}

app.listen(process.env.PORT || port, () => {
    const runningPort = process.env.PORT || port;
    console.log(`Server running on port ${runningPort}`);
    console.log(`Access the dashboard at http://localhost:${runningPort}`);
    // Initial check for any overdue scheduled messages
    checkAndSendScheduledMessages();
});
