const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const port = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup - MongoDB
// Replace with your MongoDB Atlas connection string for cloud hosting
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/employeesDB';
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB:', err.message));

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

 // API Endpoints


// Get all employees
app.get('/api/employees', async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/employees', async (req, res) => {
    const { id, name, position, email } = req.body;
    console.log('Adding new employee with email:', email);
    try {
        const newEmployee = new Employee({ id, name, position, email });
        await newEmployee.save();
        res.json({ id, name, position, email });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// Placeholder for handling email replies via Gmail API
// This endpoint would be called by a service monitoring Gmail for replies
app.post('/api/email-replies', async (req, res) => {
    const { employeeId, message, replyToEmail } = req.body;
    console.log(`Received email reply from ${replyToEmail} for employee ID: ${employeeId}`);
    try {
        const newMessage = new Message({ employeeId, message });
        await newMessage.save();
        res.json({ id: newMessage._id, employeeId, message, timestamp: newMessage.timestamp });
    } catch (err) {
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

app.listen(process.env.PORT || port, () => {
    const runningPort = process.env.PORT || port;
    console.log(`Server running on port ${runningPort}`);
    console.log(`Access the dashboard at http://localhost:${runningPort}`);
    // Initial check for any overdue scheduled messages
    checkAndSendScheduledMessages();
});
