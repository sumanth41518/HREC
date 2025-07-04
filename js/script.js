// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Function to perform fetch requests
    function fetchData(url, options = {}) {
        return fetch(url, options);
    }
    
    // Function to create a modern modal dialog
    function showModal(message, buttons = [{ text: 'OK', onClick: () => {} }]) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content modern-modal">
                <div class="modal-header">
                    <h2>Notification</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    ${buttons.map(btn => `<button class="modal-btn ${btn.class || ''}" data-text="${btn.text}">${btn.text}</button>`).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', function() {
            modal.remove();
        });

        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.remove();
            }
        });

        buttons.forEach(btn => {
            const btnElement = modal.querySelector(`.modal-btn[data-text="${btn.text}"]`);
            btnElement.addEventListener('click', function() {
                if (btn.onClick) btn.onClick();
                modal.remove();
            });
        });

        return modal;
    }

    // Function to handle confirmation dialogs
    function showConfirm(message, onYes, onNo) {
        const buttons = [
            { text: 'Yes', onClick: onYes, class: 'btn-confirm' },
            { text: 'No', onClick: onNo, class: 'btn-cancel' }
        ];
        return showModal(message, buttons);
    }
    
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the tab ID from data-tab attribute
            const tabId = this.getAttribute('data-tab');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            // Show the selected tab content
            document.getElementById(tabId).classList.add('active');
            
            // Refresh timesheet list if navigating to timesheet tab
            if (tabId === 'timesheetsContent') {
                fetchAndRenderTimesheetList();
            }
        });
    });

    // Send Reminder buttons
    const reminderButtons = document.querySelectorAll('.btn-reminder');
    
    reminderButtons.forEach(button => {
        button.addEventListener('click', function() {
            showModal('Reminder sent successfully!');
        });
    });

    // Take Action buttons
    const actionButtons = document.querySelectorAll('.btn-action');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const name = this.closest('.urgent-item').querySelector('h3').textContent;
            showModal(`Action taken for ${name}`);
        });
    });

    // Quick action buttons
    const sendMessageBtn = document.querySelector('.send-message');
    const addEmployeeBtn = document.querySelector('.add-employee');
    const scheduleMessageBtn = document.querySelector('.schedule-message');
    const viewReportsBtn = document.querySelector('.view-reports');

    sendMessageBtn.addEventListener('click', function() {
        showModal('Send Message functionality will be implemented here');
    });

    // Function to display notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <p>${message}</p>
            <button class="close-notification">×</button>
        `;
        document.body.appendChild(notification);
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        notification.style.zIndex = '1000';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '10px';
        
        // Close button functionality
        notification.querySelector('.close-notification').addEventListener('click', function() {
            notification.remove();
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Function to fetch and update messages
    let lastMessageId = 0;
    function checkForNewMessages() {
        fetchData('/api/messages')
            .then(response => response.json())
            .then(messages => {
                const newMessages = messages.filter(msg => msg.id > lastMessageId);
                if (newMessages.length > 0) {
                    newMessages.forEach(msg => {
                        showNotification(`New response from ${msg.employeeName}: ${msg.message}`);
                        updateMessagesTab(msg);
                        if (msg.id > lastMessageId) {
                            lastMessageId = msg.id;
                        }
                    });
                }
            })
            .catch(error => console.error('Error checking for messages:', error));
    }

    // Function to update messages tab
    function updateMessagesTab(message) {
        const messagesContent = document.getElementById('messagesContent');
        if (messagesContent) {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            messageItem.innerHTML = `
                <h4>Response from ${message.employeeName}</h4>
                <p>${message.message}</p>
                <small>Received at: ${new Date(message.timestamp).toLocaleString()}</small>
            `;
            messagesContent.insertBefore(messageItem, messagesContent.firstChild);
        }
    }

    // Function to fetch and display recent sent messages with employee details
    function fetchAndDisplayRecentMessages() {
        Promise.all([
            fetchData('/api/sent-messages').then(response => response.json()),
            fetchData('/api/employees').then(response => response.json())
        ])
        .then(([messages, employees]) => {
            const dashboardMessageList = document.getElementById('recentMessagesList');
            const messagesTabList = document.getElementById('messagesContent');
            const noMessagesPlaceholder = document.getElementById('noMessagesPlaceholder');
            
            if (messages.length === 0) {
                if (noMessagesPlaceholder) {
                    noMessagesPlaceholder.style.display = 'block';
                }
                if (messagesTabList) {
                    messagesTabList.innerHTML = `
                        <div class="message-item">
                            <div class="message-status delivered">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="message-content">
                                <h3>Test Recipient</h3>
                                <p><strong>Position:</strong> Test Position</p>
                                <p><strong>ID:</strong> TEST123</p>
                                <p><strong>Email:</strong> test@example.com</p>
                                <p><strong>Subject:</strong> Test Subject</p>
                                <p><strong>Message:</strong> This is a test message content.</p>
                                <span class="message-time">${new Date().toLocaleString()}</span>
                            </div>
                            <div class="message-actions">
                                <span class="status-badge delivered">Delivered</span>
                                <button class="btn-reminder">Send Reminder</button>
                            </div>
                        </div>
                    `;
                    const reminderButton = messagesTabList.querySelector('.btn-reminder');
                    if (reminderButton) {
                        reminderButton.addEventListener('click', function() {
                            showModal('Reminder sent successfully!');
                        });
                    }
                }
                return;
            }
            
            if (noMessagesPlaceholder) {
                noMessagesPlaceholder.style.display = 'none';
            }
            
            // Check for delivery status from local storage (to be updated after successful send)
            const deliveryStatuses = JSON.parse(localStorage.getItem('deliveryStatuses') || '{}');
            
            // Function to display messages in a given list element, limited to last 3 for dashboard
            const displayMessages = (messageList) => {
                if (messageList) {
                    messageList.innerHTML = '';
                    // Limit to last 3 messages if it's the dashboard list
                    const messagesToDisplay = messageList.id === 'recentMessagesList' ? messages.slice(Math.max(0, messages.length - 3)) : messages;
                    console.log(`Displaying ${messagesToDisplay.length} messages on ${messageList.id === 'recentMessagesList' ? 'dashboard' : 'messages tab'} (Total messages: ${messages.length})`);
                    messagesToDisplay.forEach(msg => {
                        // Find the employee by matching the recipient name or email
                        const employee = employees.find(emp => emp.name === msg.to || emp.email === msg.to);
                        // Determine delivery status: Check local storage for delivery confirmation, default to delivered for sent messages
                        const messageId = msg.id || `${msg.to}-${msg.timestamp}`; // Use a unique identifier if ID is not available
                        const deliveryStatus = deliveryStatuses[messageId];
                        const statusClass = deliveryStatus === 'delivered' || !deliveryStatus ? 'delivered' : 'pending';
                        const statusText = deliveryStatus === 'delivered' || !deliveryStatus ? 'Delivered' : 'Pending';
                        const statusIcon = deliveryStatus === 'delivered' || !deliveryStatus ? 'fa-check-circle' : 'fa-clock';
                        console.log(`Message to ${msg.to}: Status set to ${statusText} based on local storage or default`);
                        const messageItem = document.createElement('div');
                        messageItem.className = 'message-item';
                        // Show limited details for dashboard view, full details for messages tab
                        if (messageList.id === 'recentMessagesList') {
                            messageItem.innerHTML = `
                                <div class="message-status ${statusClass}">
                                    <i class="fas ${statusIcon}"></i>
                                </div>
                                <div class="message-content">
                                    <h3>${employee ? employee.name : msg.to}</h3>
                                    <p><strong>Subject:</strong> ${msg.subject}</p>
                                    <span class="message-time">${new Date(msg.timestamp).toLocaleString()}</span>
                                </div>
                                <div class="message-actions">
                                    <span class="status-badge ${statusClass}">${statusText}</span>
                                    <button class="btn-reminder">Send Reminder</button>
                                </div>
                            `;
} else {
    messageItem.innerHTML = `
        <div class="message-status ${statusClass}">
            <i class="fas ${statusIcon}"></i>
        </div>
        <div class="message-content">
            <h3>${msg.to}</h3>
            ${employee ? `<p><strong>Email:</strong> ${employee.email || 'Not provided'}</p>` : ''}
            <p><strong>Subject:</strong> ${msg.subject}</p>
            <span class="message-time">${new Date(msg.timestamp).toLocaleString()}</span>
        </div>
        <div class="message-actions">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <button class="btn-reminder">Send Reminder</button>
        </div>
    `;
}
                        messageList.appendChild(messageItem);
                        
                        // Add event listener to reminder button
                        messageItem.querySelector('.btn-reminder').addEventListener('click', function() {
                            showModal('Reminder sent successfully!');
                        });
                    });
                }
            };
            
            // Display messages in both dashboard and messages tab
            displayMessages(dashboardMessageList);
            displayMessages(messagesTabList);
        })
        .catch(error => {
            console.error('Error fetching recent messages or employees:', error);
            const messageList = document.getElementById('recentMessagesList');
            const noMessagesPlaceholder = document.getElementById('noMessagesPlaceholder');
            if (noMessagesPlaceholder) {
                noMessagesPlaceholder.style.display = 'none';
            }
            if (messageList) {
                messageList.innerHTML = `
                    <div class="message-item">
                        <div class="message-status delivered">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="message-content">
                            <h3>Test Recipient</h3>
                            <p><strong>Position:</strong> Test Position</p>
                            <p><strong>ID:</strong> TEST123</p>
                            <p><strong>Email:</strong> test@example.com</p>
                            <p><strong>Subject:</strong> Test Subject</p>
                            <p><strong>Message:</strong> This is a test message content.</p>
                            <span class="message-time">${new Date().toLocaleString()}</span>
                        </div>
                        <div class="message-actions">
                            <span class="status-badge delivered">Delivered</span>
                            <button class="btn-reminder">Send Reminder</button>
                        </div>
                    </div>
                `;
                const reminderButton = messageList.querySelector('.btn-reminder');
                if (reminderButton) {
                    reminderButton.addEventListener('click', function() {
                        showModal('Reminder sent successfully!');
                    });
                }
            }
        });
    }

    // Poll for new messages every 10 seconds
    setInterval(checkForNewMessages, 10000);
    // Initial check for messages
    checkForNewMessages();
    // Initial fetch of recent messages with a cache-busting parameter
    fetchAndDisplayRecentMessages();
    // Poll for recent messages every 30 seconds with a cache-busting parameter
    setInterval(fetchAndDisplayRecentMessages, 30000);
    // Add a debug log to confirm the function is called
    console.log('Updated logic for message status display applied on: ' + new Date().toLocaleString());

    // Function to update dashboard statistics
    function updateDashboardStats() {
        // Fetch message statistics
        fetchData('/api/sent-messages')
            .then(response => response.json())
            .then(messages => {
                const totalMessages = messages.length;
                const deliveredMessages = messages.filter(msg => {
                    const messageId = msg.id || `${msg.to}-${msg.timestamp}`;
                    const deliveryStatuses = JSON.parse(localStorage.getItem('deliveryStatuses') || '{}');
                    return deliveryStatuses[messageId] === 'delivered' || !deliveryStatuses[messageId];
                }).length;
                const pendingMessages = totalMessages - deliveredMessages;
                
                // Fetch response data for responded messages and response rate
                fetchData('/api/messages')
                    .then(response => response.json())
                    .then(responses => {
                        const respondedMessages = responses.length;
                        const responseRate = totalMessages > 0 ? ((respondedMessages / totalMessages) * 100).toFixed(1) : 0;
                        
                        // Update dashboard stats
                        document.getElementById('totalMessages').innerHTML = `
                            <h2>${totalMessages}</h2>
                            <p>Total Messages</p>
                        `;
                        document.getElementById('deliveredMessages').innerHTML = `
                            <h2>${deliveredMessages}</h2>
                            <p>Delivered</p>
                        `;
                        document.getElementById('pendingMessages').innerHTML = `
                            <h2>${pendingMessages}</h2>
                            <p>Pending</p>
                        `;
                        document.getElementById('respondedMessages').innerHTML = `
                            <h2>${respondedMessages}</h2>
                            <p>Responded</p>
                        `;
                        document.getElementById('responseRate').innerHTML = `
                            <h2>${responseRate}%</h2>
                            <p>Response Rate</p>
                        `;
                    })
                    .catch(error => {
                        console.error('Error fetching response data for dashboard stats:', error);
                    });
            })
            .catch(error => {
                console.error('Error fetching message data for dashboard stats:', error);
            });
    }

    // Call updateDashboardStats on initial load and set interval for periodic updates
    updateDashboardStats();
    setInterval(updateDashboardStats, 30000); // Update every 30 seconds

    // Add a test button for simulating a new message notification
    const testNotificationBtn = document.createElement('button');
    testNotificationBtn.innerHTML = '<i class="fas fa-bell"></i>';
    testNotificationBtn.style.position = 'fixed';
    testNotificationBtn.style.bottom = '20px';
    testNotificationBtn.style.right = '20px';
    testNotificationBtn.style.padding = '12px';
    testNotificationBtn.style.backgroundColor = '#007bff';
    testNotificationBtn.style.color = 'white';
    testNotificationBtn.style.border = 'none';
    testNotificationBtn.style.borderRadius = '50%';
    testNotificationBtn.style.cursor = 'pointer';
    testNotificationBtn.style.zIndex = '1000';
    testNotificationBtn.style.width = '40px';
    testNotificationBtn.style.height = '40px';
    testNotificationBtn.style.display = 'flex';
    testNotificationBtn.style.alignItems = 'center';
    testNotificationBtn.style.justifyContent = 'center';
    document.body.appendChild(testNotificationBtn);

    testNotificationBtn.addEventListener('click', function() {
        const testMessage = {
            id: lastMessageId + 1,
            employeeName: 'Test Employee',
            message: 'This is a test response message.',
            timestamp: new Date().toISOString()
        };
        showNotification(`New response from ${testMessage.employeeName}: ${testMessage.message}`);
        updateMessagesTab(testMessage);
        lastMessageId = testMessage.id;
    });

    // Add Employee Modal handling
    const modal = document.getElementById('addEmployeeModal');
    if (!modal) {
        console.error('Add Employee Modal not found in the DOM.');
        showModal('Error: Add Employee Modal not found. Please ensure the HTML structure is correct.');
    }
    const closeBtn = modal ? modal.querySelector('.close') : null;
    
    addEmployeeBtn.addEventListener('click', function() {
        if (modal) {
            modal.style.display = 'block';
        } else {
            showModal('Cannot open Add Employee Modal: Element not found.');
        }
    });
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal if user clicks outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Function to fetch and render employee list from backend
    function fetchAndRenderEmployeeList(filter = '') {
        fetchData('/api/employees')
            .then(response => response.json())
            .then(employees => {
                console.log('Fetched employees:', employees); // Debug log to check email data
                console.log('Total employees fetched:', employees.length); // Debug log for count
                // Additional debug log to highlight email field specifically
                employees.forEach(emp => console.log(`Employee ${emp.name} email: ${emp.email || 'Not provided'}`));
                const employeeList = document.querySelector('.employee-list');
                if (!employeeList) {
                    console.error('Employee list element not found in the DOM.');
                    showModal('Error: Employee list element not found. Please ensure the HTML structure is correct.');
                    return;
                }
                employeeList.innerHTML = '';
                
                // Filter employees based on search input
                const filteredEmployees = filter 
                    ? employees.filter(emp => 
                        emp.name.toLowerCase().includes(filter.toLowerCase()) || 
                        emp.id.toLowerCase().includes(filter.toLowerCase()))
                    : employees;
                
                // Enable scrollbar if employee count exceeds 4
                if (filteredEmployees.length > 4) {
                    employeeList.classList.add('scrollable');
                } else {
                    employeeList.classList.remove('scrollable');
                }
                
                if (filteredEmployees.length === 0) {
                    employeeList.innerHTML = '<p>No employees match your search criteria.</p>';
                    return;
                }
                
                filteredEmployees.forEach(employee => {
                    const employeeItem = document.createElement('div');
                    employeeItem.className = 'employee-item';
                    employeeItem.setAttribute('data-id', employee.id);
                    employeeItem.innerHTML = `
                        <div class="employee-info">
                            <h3>${employee.name}</h3>
                            <p>${employee.position}</p>
                            <span class="employee-id">ID: ${employee.id}</span>
                            <p>Email: ${employee.email || 'Not provided'}</p>
                        </div>
                        <div class="employee-actions">
                            <button class="btn-view">View Details</button>
                            <button class="btn-message">Send Message</button>
                            <button class="btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                        <div class="employee-checkbox" style="display: none; margin-right: 10px;">
                            <input type="checkbox" id="emp-check-${employee.id}" data-id="${employee.id}">
                            <label for="emp-check-${employee.id}" style="margin-left: 5px;">Select</label>
                        </div>
                    `;
                    employeeList.appendChild(employeeItem);
                    
                    // Add event listeners to the buttons
                    employeeItem.querySelector('.btn-view').addEventListener('click', function() {
                        showModal(`Viewing details for ${employee.name}`);
                    });
                    employeeItem.querySelector('.btn-message').addEventListener('click', function() {
                        sendMessageToEmployee(employee);
                    });
                    employeeItem.querySelector('.btn-edit').addEventListener('click', function() {
                        const newName = prompt(`Enter new name for ${employee.name}:`, employee.name);
                        const newPosition = prompt(`Enter new position for ${employee.name}:`, employee.position);
                        const newEmail = prompt(`Enter new email for ${employee.name}:`, employee.email || '');
                        if (newName && newPosition) {
                            fetchData(`/api/employees/${employee.id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ name: newName, position: newPosition, email: newEmail })
                            })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! Status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                showModal(`Updated profile for ${data.name}`);
                                fetchAndRenderEmployeeList(filter);
                            })
                            .catch(error => {
                                console.error('Error updating employee:', error);
                                showModal(`Failed to update employee: ${error.message}`);
                            });
                        }
                    });
                    employeeItem.querySelector('.btn-delete').addEventListener('click', function() {
                        showConfirm(`Are you sure you want to delete ${employee.name}?`, 
                            function() {
                                fetchData(`/api/employees/${employee.id}`, {
                                    method: 'DELETE'
                                })
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! Status: ${response.status}. Please ensure the backend server is running on port 3005.`);
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    showModal(data.message || 'Employee deleted successfully');
                                    fetchAndRenderEmployeeList(filter);
                                })
                                .catch(error => {
                                    console.error('Error deleting employee:', error);
                                    showModal(`Failed to delete employee: ${error.message}. If you see a 401 Unauthorized error, ensure the backend server on port 3005 is configured correctly and does not require authentication for this operation.`);
                                });
                            }, 
                            function() {
                                // No action needed on 'No'
                            }
                        );
                    });
                });
            })
            .catch(error => console.error('Error fetching employees:', error));
    }

    // Add bulk action controls to employee tab
    const employeeTab = document.getElementById('employeesContent');
    if (employeeTab) {
        const bulkActionBar = document.createElement('div');
        bulkActionBar.className = 'bulk-action-bar';
        bulkActionBar.style.marginBottom = '20px';
        bulkActionBar.style.display = 'flex';
        bulkActionBar.style.alignItems = 'center';
        bulkActionBar.style.gap = '10px';
        bulkActionBar.innerHTML = `
            <button class="btn-select-mode">Select Employees</button>
            <button class="btn-bulk-send" style="display: none;">Send Message to Selected</button>
            <button class="btn-cancel-select" style="display: none;">Cancel Selection</button>
            <span class="selection-count" style="margin-left: 10px; display: none;">Selected: 0</span>
        `;
        employeeTab.insertBefore(bulkActionBar, employeeTab.firstChild);

        const selectModeBtn = bulkActionBar.querySelector('.btn-select-mode');
        const bulkSendBtn = bulkActionBar.querySelector('.btn-bulk-send');
        const cancelSelectBtn = bulkActionBar.querySelector('.btn-cancel-select');
        const selectionCount = bulkActionBar.querySelector('.selection-count');

        let selectMode = false;
        selectModeBtn.addEventListener('click', function() {
            selectMode = true;
            selectModeBtn.style.display = 'none';
            bulkSendBtn.style.display = 'inline-block';
            cancelSelectBtn.style.display = 'inline-block';
            selectionCount.style.display = 'inline-block';
            document.querySelectorAll('.employee-checkbox').forEach(checkbox => {
                checkbox.style.display = 'block';
            });
            document.querySelectorAll('.employee-item').forEach(item => {
                item.style.border = '1px solid #2563eb';
                item.style.backgroundColor = '#f0f7ff';
            });
        });

        cancelSelectBtn.addEventListener('click', function() {
            selectMode = false;
            selectModeBtn.style.display = 'inline-block';
            bulkSendBtn.style.display = 'none';
            cancelSelectBtn.style.display = 'none';
            selectionCount.style.display = 'none';
            selectionCount.textContent = 'Selected: 0';
            document.querySelectorAll('.employee-checkbox input').forEach(checkbox => {
                checkbox.checked = false;
            });
            document.querySelectorAll('.employee-checkbox').forEach(checkbox => {
                checkbox.style.display = 'none';
            });
            document.querySelectorAll('.employee-item').forEach(item => {
                item.style.border = '1px solid #e5e7eb';
                item.style.backgroundColor = '';
            });
        });

        bulkSendBtn.addEventListener('click', function() {
            const selectedEmployees = [];
            fetchData('/api/employees')
                .then(response => response.json())
                .then(employees => {
                    document.querySelectorAll('.employee-checkbox input:checked').forEach(checkbox => {
                        const empId = checkbox.getAttribute('data-id');
                        const emp = employees.find(e => e.id === empId);
                        if (emp) {
                            selectedEmployees.push(emp);
                        }
                    });

                    if (selectedEmployees.length === 0) {
                        showModal('No employees selected. Please select at least one employee.');
                        return;
                    }

                    const templates = JSON.parse(localStorage.getItem('templates') || '[]');
                    if (templates.length === 0) {
                        showModal('No templates available. Please create a template first.');
                        return;
                    }

                    const modal = document.createElement('div');
                    modal.className = 'modal';
                    modal.style.display = 'block';
                    modal.innerHTML = `
                        <div class="modal-content">
                            <div class="modal-header">
                                <h2>Select Template for ${selectedEmployees.length} Employee(s)</h2>
                                <span class="close">&times;</span>
                            </div>
                            <div class="template-selection">
                                ${templates.map(template => `
                                    <div class="template-option" data-name="${template.name}" style="margin-bottom: 10px; border: 1px solid #e5e7eb; padding: 10px; border-radius: 5px; cursor: pointer;">
                                        <h4>${template.name}</h4>
                                        <p>${template.content}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    const closeBtn = modal.querySelector('.close');
                    closeBtn.addEventListener('click', function() {
                        modal.remove();
                    });

                    window.addEventListener('click', function(event) {
                        if (event.target === modal) {
                            modal.remove();
                        }
                    });

                    const templateOptions = modal.querySelectorAll('.template-option');
                    templateOptions.forEach(opt => {
                        opt.addEventListener('click', function() {
                            const templateName = this.getAttribute('data-name');
                            const selectedTemplate = templates.find(t => t.name === templateName);
                            modal.remove();
                            showPreviewForMultipleEmployees(selectedEmployees, selectedTemplate);
                        });
                    });
                })
                .catch(error => {
                    console.error('Error fetching employees:', error);
                    showModal('Failed to fetch employee details. Please try again.');
                });
        });

        // Update selection count
        document.addEventListener('change', function(event) {
            if (event.target.type === 'checkbox' && event.target.id.startsWith('emp-check-')) {
                const checkedCount = document.querySelectorAll('.employee-checkbox input:checked').length;
                selectionCount.textContent = `Selected: ${checkedCount}`;
            }
        });
    }
    
// Handle form submission to add new employee
const employeeForm = document.getElementById('employeeForm');
if (!employeeForm) {
    console.error('Employee Form not found in the DOM.');
    showModal('Error: Employee Form not found. Please ensure the HTML structure is correct.');
} else {
    employeeForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const employeeName = document.getElementById('employeeName');
        const employeePosition = document.getElementById('employeePosition');
        const employeeId = document.getElementById('employeeId');
        const employeeEmail = document.getElementById('employeeEmail');
        
        if (!employeeName || !employeePosition || !employeeId) {
            showModal('Error: Required form fields are missing. Please ensure the form is complete.');
            return;
        }
        
        const newEmployee = {
            name: employeeName.value,
            position: employeePosition.value,
            id: employeeId.value,
            email: employeeEmail ? employeeEmail.value : ''
        };
        
        fetchData('/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newEmployee)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}. Please ensure the backend server is running on port 3005.`);
            }
            return response.json();
        })
        .then(data => {
            fetchAndRenderEmployeeList();
            if (modal) modal.style.display = 'none';
            employeeForm.reset();
            showNotification(`Employee ${data.name} added successfully!`);
        })
        .catch(error => {
            console.error('Error adding employee:', error);
            showModal(`Failed to add employee: ${error.message}. Please ensure the backend server is running on port 3005.`);
        });
    });
}

// Function to send message to employee(s) with template selection
function sendMessageToEmployee(employee) {
    if (!employee.email || employee.email === 'Not provided') {
        showModal(`No email address available for ${employee.name}. Please update their profile with an email address.`);
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Select Template for ${employee.name}</h2>
                <span class="close">&times;</span>
            </div>
            <div class="template-selection">
                <p>Loading templates...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    fetchData('/api/templates')
        .then(response => response.json())
        .then(templates => {
            if (templates.length === 0) {
                showModal('No templates available. Please create a template first.');
                modal.remove();
                return;
            }

            const templateSelection = modal.querySelector('.template-selection');
            templateSelection.innerHTML = '';
            templates.forEach(template => {
                const templateOption = document.createElement('div');
                templateOption.className = 'template-option';
                templateOption.setAttribute('data-name', template.name);
                templateOption.innerHTML = `
                    <h4>${template.name}</h4>
                    <p>${template.content}</p>
                `;
                templateSelection.appendChild(templateOption);

                templateOption.addEventListener('click', function() {
                    const selectedTemplate = templates.find(t => t.name === template.name);
                    if (selectedTemplate) {
                        // Create a preview of the email with placeholders replaced
                        let previewText = selectedTemplate.content;
                        previewText = previewText.replace(/{{employeeName}}/g, employee.name);
                        previewText = previewText.replace(/{{employeeId}}/g, employee.id);
                        previewText = previewText.replace(/{{employeeEmail}}/g, employee.email || 'Not provided');
                        previewText = previewText.replace(/{{employeePosition}}/g, employee.position);
                        
                        const previewModal = document.createElement('div');
                        previewModal.className = 'modal';
                        previewModal.style.display = 'block';
                        previewModal.innerHTML = `
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h2>Email Preview for ${employee.name}</h2>
                                    <span class="close-preview">&times;</span>
                                </div>
                                <div class="email-preview">
                                    <h4>Subject: ${selectedTemplate.name}</h4>
                                    <p>${previewText}</p>
                                </div>
                                <div class="preview-actions">
                                    <button class="btn-send">Send Email</button>
                                    <button class="btn-cancel">Cancel</button>
                                </div>
                            </div>
                        `;
                        document.body.appendChild(previewModal);
                        
                        const closePreviewBtn = previewModal.querySelector('.close-preview');
                        closePreviewBtn.addEventListener('click', function() {
                            previewModal.remove();
                        });
                        
                        window.addEventListener('click', function(event) {
                            if (event.target === previewModal) {
                                previewModal.remove();
                            }
                        });
                        
                        const sendBtn = previewModal.querySelector('.btn-send');
                        sendBtn.addEventListener('click', function() {
                            // Show spinner on button
                            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                            sendBtn.disabled = true;
                            fetchData('/api/send-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    to: employee.email,
                                    subject: selectedTemplate.name,
                                    text: previewText // Send the processed text with placeholders already replaced
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                sendBtn.innerHTML = 'Send Email';
                                sendBtn.disabled = false;
                                if (data.error) {
                                    showModal(`Failed to send email to ${employee.name}: ${data.details}`);
                                } else {
                                    showModal(`Email sent successfully to ${employee.name} at ${employee.email} with template: ${selectedTemplate.name}`);
                                    // Update delivery status in local storage
                                    const messageId = data.id || `${employee.email}-${new Date().toISOString()}`; // Use server-provided ID if available
                                    const deliveryStatuses = JSON.parse(localStorage.getItem('deliveryStatuses') || '{}');
                                    deliveryStatuses[messageId] = 'delivered';
                                    localStorage.setItem('deliveryStatuses', JSON.stringify(deliveryStatuses));
                                    // Refresh the dashboard to show updated status
                                    fetchAndDisplayRecentMessages();
                                }
                                previewModal.remove();
                                modal.remove();
                            })
                            .catch(error => {
                                sendBtn.innerHTML = 'Send Email';
                                sendBtn.disabled = false;
                                console.error('Error sending email:', error);
                                showModal(`Error sending email to ${employee.name}: ${error.message}`);
                                previewModal.remove();
                                modal.remove();
                            });
                        });
                        
                        const cancelBtn = previewModal.querySelector('.btn-cancel');
                        cancelBtn.addEventListener('click', function() {
                            previewModal.remove();
                        });
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error fetching templates for selection:', error);
            showModal('Failed to load templates. Please try again.');
            modal.remove();
        });

    const modalCloseBtn = modal.querySelector('.close');
    modalCloseBtn.addEventListener('click', function() {
        modal.remove();
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    });
}

// Function to send message to multiple employees (not used directly, integrated into employee tab)
function sendMessageToMultipleEmployees() {
    showModal('This feature is now available in the Employees tab. Use the "Select Employees" button to choose multiple recipients.');
}

// Function to show preview for multiple employees
function showPreviewForMultipleEmployees(employees, selectedTemplate) {
    const previewModal = document.createElement('div');
    previewModal.className = 'modal';
    previewModal.style.display = 'block';
    previewModal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Email Preview for ${employees.length} Employee(s)</h2>
                <span class="close-preview">&times;</span>
            </div>
            <div class="email-preview" style="max-height: 400px; overflow-y: auto;">
                <h4>Subject: ${selectedTemplate.name}</h4>
                ${employees.map(emp => {
                    let previewText = selectedTemplate.content;
                    previewText = previewText.replace(/{{employeeName}}/g, emp.name);
                    previewText = previewText.replace(/{{employeeId}}/g, emp.id);
                    previewText = previewText.replace(/{{employeeEmail}}/g, emp.email || 'Not provided');
                    previewText = previewText.replace(/{{employeePosition}}/g, emp.position);
                    return `
                        <div style="margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                            <h5>To: ${emp.name} (${emp.email || 'No Email'})</h5>
                            <p>${previewText}</p>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="preview-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn-send-multiple">Send Emails</button>
                <button class="btn-cancel-preview">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(previewModal);

    const closePreviewBtn = previewModal.querySelector('.close-preview');
    closePreviewBtn.addEventListener('click', function() {
        previewModal.remove();
    });

    window.addEventListener('click', function(event) {
        if (event.target === previewModal) {
            previewModal.remove();
        }
    });

    const cancelBtn = previewModal.querySelector('.btn-cancel-preview');
    cancelBtn.addEventListener('click', function() {
        previewModal.remove();
    });

    const sendBtn = previewModal.querySelector('.btn-send-multiple');
    sendBtn.addEventListener('click', function() {
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        sendBtn.disabled = true;

        let successCount = 0;
        let errorCount = 0;
        const total = employees.length;

        employees.forEach(emp => {
            let emailText = selectedTemplate.content;
            emailText = emailText.replace(/{{employeeName}}/g, emp.name);
            emailText = emailText.replace(/{{employeeId}}/g, emp.id);
            emailText = emailText.replace(/{{employeeEmail}}/g, emp.email || 'Not provided');
            emailText = emailText.replace(/{{employeePosition}}/g, emp.position);

            fetchData('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: emp.email,
                    subject: selectedTemplate.name,
                    text: emailText
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    errorCount++;
                    console.error(`Failed to send email to ${emp.name}: ${data.details}`);
                } else {
                    successCount++;
                    // Update delivery status in local storage
                    const messageId = data.id || `${emp.email}-${new Date().toISOString()}`;
                    const deliveryStatuses = JSON.parse(localStorage.getItem('deliveryStatuses') || '{}');
                    deliveryStatuses[messageId] = 'delivered';
                    localStorage.setItem('deliveryStatuses', JSON.stringify(deliveryStatuses));
                }

                if (successCount + errorCount === total) {
                    sendBtn.innerHTML = 'Send Emails';
                    sendBtn.disabled = false;
                    showModal(`Emails sent: ${successCount} successful, ${errorCount} failed.`);
                    fetchAndDisplayRecentMessages();
                    previewModal.remove();
                }
            })
            .catch(error => {
                errorCount++;
                console.error(`Error sending email to ${emp.name}:`, error);
                if (successCount + errorCount === total) {
                    sendBtn.innerHTML = 'Send Emails';
                    sendBtn.disabled = false;
                    showModal(`Emails sent: ${successCount} successful, ${errorCount} failed.`);
                    fetchAndDisplayRecentMessages();
                    previewModal.remove();
                }
            });
        });
    });
}
    
    // Initial render of employee list
    fetchAndRenderEmployeeList();
    
    // Add event listener for search functionality
    const employeeSearch = document.getElementById('employeeSearch');
    if (employeeSearch) {
        employeeSearch.addEventListener('input', function() {
            fetchAndRenderEmployeeList(this.value);
        });
    }

    // Export to Excel functionality
    const exportButton = document.getElementById('exportToExcel');
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            fetchData('/api/employees')
                .then(response => response.json())
                .then(employees => {
                    // Prepare data for Excel
                    const worksheetData = employees.map(employee => ({
                        ID: employee.id,
                        Name: employee.name,
                        Position: employee.position,
                        Email: employee.email || 'Not provided'
                    }));

                    // Load SheetJS library dynamically
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    script.onload = function() {
                        // Create a new workbook and worksheet
                        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
                        
                        // Generate Excel file and trigger download
                        XLSX.writeFile(workbook, 'Employees.xlsx');
                    };
                    document.head.appendChild(script);
                })
                .catch(error => {
                    console.error('Error fetching employees for export:', error);
                    showModal('Failed to export data to Excel. Please try again.');
                });
        });
    }

    // Function to fetch and render timesheet list from backend
    function fetchAndRenderTimesheetList() {
        fetchData('/api/timesheets')
            .then(response => response.json())
            .then(timesheets => {
                const timesheetListContent = document.getElementById('timesheetListContent');
                timesheetListContent.innerHTML = '';
                
                if (timesheets.length === 0) {
                    timesheetListContent.innerHTML = '<p>No timesheets uploaded yet.</p>';
                    return;
                }
                
                // Filter out timesheets that failed deletion to avoid repeated issues
                let failedDeletions = JSON.parse(localStorage.getItem('failedDeletions') || '[]');
                timesheets = timesheets.filter(ts => !failedDeletions.includes(ts._id));
                
                if (timesheets.length === 0 && failedDeletions.length > 0) {
                    timesheetListContent.innerHTML = '<p>No timesheets available. Some were hidden due to deletion issues. Clear hidden items in local storage if needed.</p>';
                    return;
                }
                
                // Create a table for displaying timesheets
                const table = document.createElement('table');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Uploaded On</th>
                            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="timesheetTableBody">
                    </tbody>
                `;
                timesheetListContent.appendChild(table);
                
                const tbody = document.getElementById('timesheetTableBody');
                timesheets.forEach(timesheet => {
                    const row = document.createElement('tr');
                    row.setAttribute('data-id', timesheet._id);
                    row.innerHTML = `
                        <td style="border: 1px solid #ddd; padding: 8px;">${timesheet.name}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(timesheet.uploadedAt).toLocaleString()}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">
                            <button class="btn-distribute-single" title="Distribute"><i class="fas fa-paper-plane"></i></button>
                            <button class="btn-view-status-single" title="View Status"><i class="fas fa-eye"></i></button>
                            <button class="btn-delete-timesheet" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;
                    tbody.appendChild(row);
                    
                    // Add event listeners to the buttons
                    row.querySelector('.btn-distribute-single').addEventListener('click', function() {
                        distributeTimesheet(timesheet._id);
                    });
                    row.querySelector('.btn-view-status-single').addEventListener('click', function() {
                        viewTimesheetStatus(timesheet._id);
                    });
                    row.querySelector('.btn-delete-timesheet').addEventListener('click', function() {
                        console.log('Delete button clicked for timesheet ID:', timesheet._id);
                        console.log('Timesheet details:', JSON.stringify(timesheet, null, 2));
                        showConfirm(`Are you sure you want to delete the timesheet: ${timesheet.name}?`, 
                            function() {
                                // First, re-fetch the current list of timesheets to verify the ID exists
                                fetchData('/api/timesheets')
                                    .then(response => response.json())
                                    .then(currentTimesheets => {
                                        console.log('Current timesheet IDs in database:', currentTimesheets.map(ts => ts._id));
                                        console.log('Full timesheet list from server:', JSON.stringify(currentTimesheets, null, 2));
                                        const timesheetExists = currentTimesheets.some(ts => ts._id === timesheet._id);
                                        if (!timesheetExists) {
                                            console.log('Timesheet ID ' + timesheet._id + ' not found in current list. Aborting deletion.');
                                            showModal('This timesheet (ID: ' + timesheet._id + ') no longer exists in the database. The list will be refreshed to show the current data.');
                                            fetchAndRenderTimesheetList();
                                            return;
                                        }
                                        console.log('Timesheet ID ' + timesheet._id + ' found in database. Proceeding with deletion.');
                                        // Proceed with deletion if the timesheet exists
                                        fetchData(`/api/timesheets/${timesheet._id}`, {
                                            method: 'DELETE'
                                        })
                                        .then(deleteResponse => {
                                            if (!deleteResponse.ok) {
                                                throw new Error(`HTTP error! Status: ${deleteResponse.status}`);
                                            }
                                            return deleteResponse.json();
                                        })
                                        .then(data => {
                                            showModal(data.message || 'Timesheet deleted successfully');
                                            fetchAndRenderTimesheetList();
                                        })
                                        .catch(error => {
                                            console.error('Error deleting timesheet:', error);
                                            console.log('Attempted to delete timesheet with ID:', timesheet._id);
                                            console.log('Full error details:', error.message);
                                            // Store the ID in localStorage to hide it from the list if deletion fails repeatedly
                                            let failedDeletions = JSON.parse(localStorage.getItem('failedDeletions') || '[]');
                                            if (!failedDeletions.includes(timesheet._id)) {
                                                failedDeletions.push(timesheet._id);
                                                localStorage.setItem('failedDeletions', JSON.stringify(failedDeletions));
                                            }
                                            showModal(`Failed to delete timesheet: ${error.message}. There might be a data inconsistency or the server could not find the timesheet. This timesheet will be hidden from the list to prevent further issues. Refresh the page to update the view.`);
                                            fetchAndRenderTimesheetList();
                                        });
                                    })
                                    .catch(error => {
                                        console.error('Error verifying timesheet existence:', error);
                                        showModal('Failed to verify timesheet existence. Please try again.');
                                    });
                            }, 
                            function() {
                                // No action needed on 'No'
                            }
                        );
                    });
                });
            })
            .catch(error => {
                console.error('Error fetching timesheets:', error);
                showModal('Failed to fetch timesheets. Please try again.');
            });
    }
    
    // Function to distribute timesheet to employees
    function distributeTimesheet(timesheetId) {
        fetchData('/api/employees')
            .then(response => response.json())
            .then(employees => {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.style.display = 'block';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Select Employees for Distribution</h2>
                            <span class="close">&times;</span>
                        </div>
                        <div class="employee-selection">
                            <button id="selectAllBtn" style="margin-bottom: 10px;">Select All</button>
                            <div id="employeeCheckboxes" style="max-height: 300px; overflow-y: auto;">
                                ${employees.map(emp => `
                                    <div style="margin-bottom: 5px;">
                                        <input type="checkbox" id="emp-${emp.id}" value="${emp.id}">
                                        <label for="emp-${emp.id}">${emp.name} (${emp.email || 'No Email'})</label>
                                    </div>
                                `).join('')}
                            </div>
                            <button id="distributeSelectedBtn" style="margin-top: 10px;">Distribute to Selected</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                const closeBtn = modal.querySelector('.close');
                closeBtn.addEventListener('click', function() {
                    modal.remove();
                });

                window.addEventListener('click', function(event) {
                    if (event.target === modal) {
                        modal.remove();
                    }
                });

                const selectAllBtn = modal.querySelector('#selectAllBtn');
                selectAllBtn.addEventListener('click', function() {
                    const checkboxes = modal.querySelectorAll('#employeeCheckboxes input[type="checkbox"]');
                    checkboxes.forEach(checkbox => checkbox.checked = true);
                });

                const distributeSelectedBtn = modal.querySelector('#distributeSelectedBtn');
                distributeSelectedBtn.addEventListener('click', function() {
                    const selectedEmployeeIds = Array.from(modal.querySelectorAll('#employeeCheckboxes input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
                    if (selectedEmployeeIds.length === 0) {
                        showModal('Please select at least one employee.');
                        return;
                    }

                    fetchData('/api/timesheets/distribute', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            timesheetId: timesheetId,
                            employeeIds: selectedEmployeeIds
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        showModal(data.message);
                        modal.remove();
                    })
                    .catch(error => {
                        console.error('Error distributing timesheet:', error);
                        showModal('Failed to distribute timesheet. Please try again.');
                    });
                });
            })
            .catch(error => {
                console.error('Error fetching employees for distribution:', error);
                showModal('Failed to fetch employees. Please try again.');
            });
    }

// Function to view timesheet submission status with periodic refresh
function viewTimesheetStatus(timesheetId) {
    let refreshInterval;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Timesheet Submission Status</h2>
                <span class="close">&times;</span>
            </div>
            <div class="submission-status" style="max-height: 400px; overflow-y: auto;">
                <p>Loading status...</p>
            </div>
            <div class="refresh-info" style="margin-top: 10px; font-size: 0.8em; color: #666;">
                Status updates every 30 seconds. <button class="btn-refresh-now">Refresh Now</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', function() {
        clearInterval(refreshInterval);
        modal.remove();
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            clearInterval(refreshInterval);
            modal.remove();
        }
    });

    const refreshBtn = modal.querySelector('.btn-refresh-now');
    refreshBtn.addEventListener('click', function() {
        updateStatus(timesheetId, modal);
    });

    function updateStatus(timesheetId, modal) {
        fetchData(`/api/timesheets/status/${timesheetId}`)
            .then(response => response.json())
            .then(submissions => {
                const statusDiv = modal.querySelector('.submission-status');
                statusDiv.innerHTML = submissions.length > 0 ? submissions.map(sub => `
                    <div style="margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">
                        <p><strong>${sub.employeeName}</strong> (${sub.email || 'No Email'})</p>
                        <p>Status: ${sub.submitted ? 'Submitted on ' + new Date(sub.submissionDate).toLocaleString() : 'Pending'}</p>
                    </div>
                `).join('') : '<p>No submissions data available.</p>';
            })
            .catch(error => {
                console.error('Error fetching timesheet status:', error);
                showModal('Failed to fetch timesheet status. Please try again.');
            });
    }

    // Initial update
    updateStatus(timesheetId, modal);

    // Set up periodic refresh every 30 seconds
    refreshInterval = setInterval(() => {
        updateStatus(timesheetId, modal);
    }, 30000);
}

    // Function to fetch and render template list from backend
    function fetchAndRenderTemplateList() {
        fetchData('/api/templates')
            .then(response => response.json())
            .then(templates => {
                const templateListContent = document.getElementById('templateListContent');
                templateListContent.innerHTML = '';
                
                if (templates.length === 0) {
                    templateListContent.innerHTML = '<p>No templates saved yet.</p>';
                    return;
                }
                
                templates.forEach(template => {
                    const templateItem = document.createElement('div');
                    templateItem.className = 'template-item';
                    templateItem.setAttribute('data-id', template._id);
                    templateItem.innerHTML = `
                        <h4>${template.name}</h4>
                        <p>${template.content}</p>
                        <div class="template-actions">
                            <button class="btn-edit-template" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete-template" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    `;
                    templateListContent.appendChild(templateItem);
                    
                    // Add event listeners to the buttons
                    templateItem.querySelector('.btn-edit-template').addEventListener('click', function() {
                        const newName = prompt(`Enter new name for ${template.name}:`, template.name);
                        const newContent = prompt(`Enter new content for ${template.name}:`, template.content);
                        if (newName && newContent) {
                            fetchData(`/api/templates/${template._id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ name: newName, content: newContent })
                            })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! Status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                showModal(`Updated template: ${data.name}`);
                                fetchAndRenderTemplateList();
                            })
                            .catch(error => {
                                console.error('Error updating template:', error);
                                showModal(`Failed to update template: ${error.message}`);
                            });
                        }
                    });
                    templateItem.querySelector('.btn-delete-template').addEventListener('click', function() {
                        showConfirm(`Are you sure you want to delete the template: ${template.name}?`, 
                            function() {
                                fetchData(`/api/templates/${template._id}`, {
                                    method: 'DELETE'
                                })
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP error! Status: ${response.status}`);
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    showModal(data.message || 'Template deleted successfully');
                                    fetchAndRenderTemplateList();
                                })
                                .catch(error => {
                                    console.error('Error deleting template:', error);
                                    showModal(`Failed to delete template: ${error.message}`);
                                });
                            }, 
                            function() {
                                // No action needed on 'No'
                            }
                        );
                    });
                });
            })
            .catch(error => {
                console.error('Error fetching templates:', error);
                showModal('Failed to fetch templates. Please try again.');
            });
    }
    
    // Handle template form submission
    const templateForm = document.getElementById('templateForm');
    if (templateForm) {
        templateForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const newTemplate = {
                name: document.getElementById('templateName').value,
                content: document.getElementById('templateContent').value
            };
            
            fetchData('/api/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTemplate)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                showNotification(`Template ${data.name} added successfully!`);
                fetchAndRenderTemplateList();
                templateForm.reset();
            })
            .catch(error => {
                console.error('Error adding template:', error);
                showModal(`Failed to add template: ${error.message}`);
            });
        });
    }
    
    // Add instruction and buttons for placeholders in template form
    const templateContentField = document.getElementById('templateContent');
    if (templateContentField) {
        const placeholderNote = document.createElement('p');
        placeholderNote.style.color = '#666';
        placeholderNote.style.fontSize = '0.9em';
        placeholderNote.style.marginTop = '5px';
        placeholderNote.textContent = 'Use the buttons below to insert placeholders for employee data in your template.';
        templateContentField.parentNode.insertBefore(placeholderNote, templateContentField.nextSibling);
        
        const placeholderButtonsContainer = document.createElement('div');
        placeholderButtonsContainer.style.marginTop = '10px';
        placeholderButtonsContainer.innerHTML = `
            <button type="button" class="btn-placeholder" data-placeholder="{{employeeName}}">Name</button>
            <button type="button" class="btn-placeholder" data-placeholder="{{employeeId}}">ID</button>
            <button type="button" class="btn-placeholder" data-placeholder="{{employeeEmail}}">Email</button>
            <button type="button" class="btn-placeholder" data-placeholder="{{employeePosition}}">Position</button>
        `;
        templateContentField.parentNode.insertBefore(placeholderButtonsContainer, placeholderNote.nextSibling);
        
        placeholderButtonsContainer.querySelectorAll('.btn-placeholder').forEach(button => {
            button.addEventListener('click', function() {
                const placeholder = this.getAttribute('data-placeholder');
                const startPos = templateContentField.selectionStart;
                const endPos = templateContentField.selectionEnd;
                const text = templateContentField.value;
                templateContentField.value = text.substring(0, startPos) + placeholder + text.substring(endPos);
                templateContentField.focus();
                templateContentField.selectionStart = templateContentField.selectionEnd = startPos + placeholder.length;
            });
        });
    }
    
    // Initial render of template list from backend
    fetchAndRenderTemplateList();
    
    // Initial render of timesheet list from backend with a refresh to ensure data is current
    fetchAndRenderTimesheetList();
    // Add a small delay and refresh again to ensure data sync
    setTimeout(fetchAndRenderTimesheetList, 2000);
    
    // Handle timesheet form submission
    const timesheetForm = document.getElementById('timesheetForm');
    if (timesheetForm) {
        timesheetForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const timesheetName = document.getElementById('timesheetName').value;
            const timesheetFile = document.getElementById('timesheetFile').files[0];
            if (!timesheetName || !timesheetFile) {
                showModal('Please provide both a name and a file for the timesheet.');
                return;
            }
            
            const formData = new FormData();
            formData.append('name', timesheetName);
            formData.append('file', timesheetFile);
            
            fetch('/api/timesheets', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                showNotification(`Timesheet ${data.name} uploaded successfully!`);
                fetchAndRenderTimesheetList();
                timesheetForm.reset();
            })
            .catch(error => {
                console.error('Error uploading timesheet:', error);
                showModal(`Failed to upload timesheet: ${error.message}`);
            });
        });
    }
    
    // Add event listeners for timesheet action buttons
    const distributeTimesheetBtn = document.getElementById('distributeTimesheetBtn');
    if (distributeTimesheetBtn) {
        distributeTimesheetBtn.addEventListener('click', function() {
            const selectedTimesheet = document.querySelector('.timesheet-item[data-id]');
            if (selectedTimesheet) {
                distributeTimesheet(selectedTimesheet.getAttribute('data-id'));
            } else {
                showModal('Please upload a timesheet first.');
            }
        });
    }
    
    const viewTimesheetStatusBtn = document.getElementById('viewTimesheetStatusBtn');
    if (viewTimesheetStatusBtn) {
        viewTimesheetStatusBtn.addEventListener('click', function() {
            const selectedTimesheet = document.querySelector('.timesheet-item[data-id]');
            if (selectedTimesheet) {
                viewTimesheetStatus(selectedTimesheet.getAttribute('data-id'));
            } else {
                showModal('Please upload a timesheet first.');
            }
        });
    }

    scheduleMessageBtn.addEventListener('click', function() {
        const modal = document.getElementById('scheduleMessageModal');
        modal.style.display = 'block';
        
        // Populate recipient dropdown
        const recipientSelect = document.getElementById('recipient');
        recipientSelect.innerHTML = '<option value="">Select Recipient</option>';
        recipientSelect.innerHTML += '<option value="all">All Employees</option>';
        fetchData('/api/employees')
            .then(response => response.json())
            .then(employees => {
                employees.forEach(employee => {
                    const option = document.createElement('option');
                    option.value = employee.id;
                    option.textContent = `${employee.name} (${employee.email || 'No Email'})`;
                    recipientSelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching employees:', error));
        
        // Populate template dropdown from backend
        const templateSelect = document.getElementById('template');
        templateSelect.innerHTML = '<option value="">Select Template</option>';
        fetchData('/api/templates')
            .then(response => response.json())
            .then(templates => {
                templates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.name;
                    option.textContent = template.name;
                    templateSelect.appendChild(option);
                });
            })
            .catch(error => console.error('Error fetching templates for dropdown:', error));
    });
    
    // Handle schedule message form submission
    const scheduleMessageForm = document.getElementById('scheduleMessageForm');
    scheduleMessageForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const recipientId = document.getElementById('recipient').value;
        const templateName = document.getElementById('template').value;
        const scheduleDate = document.getElementById('scheduleDate').value;
        const scheduleTime = document.getElementById('scheduleTime').value;
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        
        fetchData('/api/templates')
            .then(response => response.json())
            .then(templates => {
                const selectedTemplate = templates.find(t => t.name === templateName);
                
                if (!selectedTemplate) {
                    showModal('Selected template not found.');
                    return;
                }
                
                // Fetch employee details to replace placeholders
                fetchData(`/api/employees`)
                    .then(response => response.json())
                    .then(employees => {
                        if (recipientId === 'all') {
                            // Schedule message for all employees
                            let successCount = 0;
                            let errorCount = 0;
                            employees.forEach(employee => {
                                let messageContent = selectedTemplate.content;
                                messageContent = messageContent.replace(/{{employeeName}}/g, employee.name);
                                messageContent = messageContent.replace(/{{employeeId}}/g, employee.id);
                                messageContent = messageContent.replace(/{{employeeEmail}}/g, employee.email || 'Not provided');
                                messageContent = messageContent.replace(/{{employeePosition}}/g, employee.position);
                                
                                const scheduledMessage = {
                                    recipientId: employee.id,
                                    recipientEmail: employee.email,
                                    subject: templateName,
                                    content: messageContent,
                                    scheduledTime: scheduledDateTime
                                };
                                
                                fetchData('/api/schedule-message', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify(scheduledMessage)
                                })
                                .then(response => {
                                    const contentType = response.headers.get('content-type');
                                    if (contentType && contentType.includes('application/json')) {
                                        return response.json();
                                    } else {
                                        throw new Error('Response is not in JSON format');
                                    }
                                })
                                .then(data => {
                                    if (data.error) {
                                        errorCount++;
                                        console.error(`Failed to schedule for ${employee.name}: ${data.details}`);
                                    } else {
                                        successCount++;
                                    }
                                    if (successCount + errorCount === employees.length) {
                                        showModal(`Messages scheduled: ${successCount} successful, ${errorCount} failed.`);
                                        document.getElementById('scheduleMessageModal').style.display = 'none';
                                        scheduleMessageForm.reset();
                                    }
                                })
                                .catch(error => {
                                    errorCount++;
                                    console.error(`Error scheduling for ${employee.name}:`, error);
                                    if (successCount + errorCount === employees.length) {
                                        showModal(`Messages scheduled: ${successCount} successful, ${errorCount} failed.`);
                                        document.getElementById('scheduleMessageModal').style.display = 'none';
                                        scheduleMessageForm.reset();
                                    }
                                });
                            });
                        } else {
                            const employee = employees.find(emp => emp.id === recipientId);
                            if (!employee) {
                                showModal('Recipient not found.');
                                return;
                            }
                            
                            let messageContent = selectedTemplate.content;
                            messageContent = messageContent.replace(/{{employeeName}}/g, employee.name);
                            messageContent = messageContent.replace(/{{employeeId}}/g, employee.id);
                            messageContent = messageContent.replace(/{{employeeEmail}}/g, employee.email || 'Not provided');
                            messageContent = messageContent.replace(/{{employeePosition}}/g, employee.position);
                            
                            const scheduledMessage = {
                                recipientId: recipientId,
                                recipientEmail: employee.email,
                                subject: templateName,
                                content: messageContent,
                                scheduledTime: scheduledDateTime
                            };
                            
                            fetchData('/api/schedule-message', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(scheduledMessage)
                            })
                            .then(response => {
                                console.log('Response status:', response.status);
                                console.log('Response headers:', [...response.headers.entries()]);
                                const contentType = response.headers.get('content-type');
                                if (contentType && contentType.includes('application/json')) {
                                    return response.json();
                                } else {
                                    response.text().then(text => {
                                        console.log('Non-JSON response content:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
                                    });
                                    throw new Error('Response is not in JSON format');
                                }
                            })
                            .then(data => {
                                if (data.error) {
                                    showModal(`Failed to schedule message: ${data.details}`);
                                } else {
                                    showModal(`Message scheduled successfully for ${employee.name} at ${new Date(scheduledDateTime).toLocaleString()}`);
                                    document.getElementById('scheduleMessageModal').style.display = 'none';
                                    scheduleMessageForm.reset();
                                }
                            })
                            .catch(error => {
                                console.error('Error scheduling message:', error);
                                console.error('Error details:', error.name, error.message, error.stack);
                                showModal(`Error scheduling message: ${error.message}. Please ensure the backend server is running on port 3005. Check the browser console for detailed error information. If the server is not running, start it using the appropriate script in the backend folder.`);
                            });
                        }
                    })
                    .catch(error => console.error('Error fetching employee details:', error));
            })
            .catch(error => {
                console.error('Error fetching templates:', error);
                showModal('Failed to fetch templates. Please try again.');
            });
    });
    
    // Close modal functionality for schedule message modal
    const scheduleMessageModal = document.getElementById('scheduleMessageModal');
    const scheduleCloseBtn = scheduleMessageModal.querySelector('.close');
    scheduleCloseBtn.addEventListener('click', function() {
        scheduleMessageModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === scheduleMessageModal) {
            scheduleMessageModal.style.display = 'none';
        }
    });

    viewReportsBtn.addEventListener('click', function() {
        // Switch to Analytics tab
        const analyticsNavItem = document.querySelector('.nav-item[data-tab="analytics"]');
        if (analyticsNavItem) {
            analyticsNavItem.click();
        }
        // Fetch and display reports
        fetchAndDisplayReports();
    });

    // Function to fetch and display reports for Analytics tab
    function fetchAndDisplayReports() {
        // Fetch message statistics
        fetchData('/api/sent-messages')
            .then(response => response.json())
            .then(messages => {
                const totalMessages = messages.length;
                const deliveredMessages = messages.filter(msg => {
                    const messageId = msg.id || `${msg.to}-${msg.timestamp}`;
                    const deliveryStatuses = JSON.parse(localStorage.getItem('deliveryStatuses') || '{}');
                    return deliveryStatuses[messageId] === 'delivered' || !deliveryStatuses[messageId];
                }).length;
                const pendingMessages = totalMessages - deliveredMessages;
                
                const messageStatsDiv = document.getElementById('messageStats');
                const noMessageStats = document.getElementById('noMessageStats');
                if (noMessageStats) {
                    noMessageStats.style.display = 'none';
                }
                if (messageStatsDiv) {
                    messageStatsDiv.innerHTML = `
                        <div class="stat-card">
                            <div class="stat-icon blue">
                                <i class="far fa-comment"></i>
                            </div>
                            <div class="stat-content">
                                <h2>${totalMessages}</h2>
                                <p>Total Messages</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon green">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="stat-content">
                                <h2>${deliveredMessages}</h2>
                                <p>Delivered</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon orange">
                                <i class="far fa-clock"></i>
                            </div>
                            <div class="stat-content">
                                <h2>${pendingMessages}</h2>
                                <p>Pending</p>
                            </div>
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('Error fetching message statistics:', error);
                const noMessageStats = document.getElementById('noMessageStats');
                if (noMessageStats) {
                    noMessageStats.textContent = 'Failed to load message statistics.';
                    noMessageStats.style.display = 'block';
                }
            });

        // Fetch timesheet submission status
        fetchData('/api/timesheets')
            .then(response => response.json())
            .then(timesheets => {
                if (timesheets.length === 0) {
                    const timesheetStatsDiv = document.getElementById('timesheetStats');
                    const noTimesheetStats = document.getElementById('noTimesheetStats');
                    if (noTimesheetStats) {
                        noTimesheetStats.style.display = 'none';
                    }
                    if (timesheetStatsDiv) {
                        timesheetStatsDiv.innerHTML = '<p>No timesheets available.</p>';
                    }
                    return;
                }

                // For simplicity, show status of the most recent timesheet
                const latestTimesheet = timesheets[timesheets.length - 1];
                fetchData(`/api/timesheets/status/${latestTimesheet._id}`)
                    .then(response => response.json())
                    .then(submissions => {
                        const totalEmployees = submissions.length;
                        const submittedCount = submissions.filter(sub => sub.submitted).length;
                        const pendingCount = totalEmployees - submittedCount;
                        
                        const timesheetStatsDiv = document.getElementById('timesheetStats');
                        const noTimesheetStats = document.getElementById('noTimesheetStats');
                        if (noTimesheetStats) {
                            noTimesheetStats.style.display = 'none';
                        }
                        if (timesheetStatsDiv) {
                            timesheetStatsDiv.innerHTML = `
                                <div class="stat-card">
                                    <div class="stat-icon blue">
                                        <i class="fas fa-file-excel"></i>
                                    </div>
                                    <div class="stat-content">
                                        <h2>${totalEmployees}</h2>
                                        <p>Total Employees</p>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon green">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div class="stat-content">
                                        <h2>${submittedCount}</h2>
                                        <p>Submitted</p>
                                    </div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-icon orange">
                                        <i class="far fa-clock"></i>
                                    </div>
                                    <div class="stat-content">
                                        <h2>${pendingCount}</h2>
                                        <p>Pending</p>
                                    </div>
                                </div>
                            `;
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching timesheet submission status:', error);
                        const noTimesheetStats = document.getElementById('noTimesheetStats');
                        if (noTimesheetStats) {
                            noTimesheetStats.textContent = 'Failed to load timesheet submission status.';
                            noTimesheetStats.style.display = 'block';
                        }
                    });
            })
            .catch(error => {
                console.error('Error fetching timesheets for reports:', error);
                const noTimesheetStats = document.getElementById('noTimesheetStats');
                if (noTimesheetStats) {
                    noTimesheetStats.textContent = 'Failed to load timesheet submission status.';
                    noTimesheetStats.style.display = 'block';
                }
            });
    }

    // Add event listener to refresh reports when Analytics tab is selected
    const analyticsNavItem = document.querySelector('.nav-item[data-tab="analytics"]');
    if (analyticsNavItem) {
        analyticsNavItem.addEventListener('click', function() {
            fetchAndDisplayReports();
        });
    }

    // Employee action buttons
    const viewDetailButtons = document.querySelectorAll('.btn-view');
    const messageButtons = document.querySelectorAll('.btn-message');
    
    // Function to show employee profile in a modal
    function showEmployeeProfile(employee) {
        const profileModal = document.createElement('div');
        profileModal.className = 'modal';
        profileModal.style.display = 'block';
        profileModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>Employee Profile</h2>
                    <span class="close-profile">&times;</span>
                </div>
                <div class="employee-profile" style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <div style="width: 100px; height: 100px; background-color: #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 20px;">
                            <i class="fas fa-user" style="font-size: 50px; color: #666;"></i>
                        </div>
                        <div>
                            <h3 style="margin: 0;">${employee.name}</h3>
                            <p style="color: #666; margin: 5px 0 0 0;">${employee.position}</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 5px 0; color: #333;">Details</h4>
                        <p><strong>ID:</strong> ${employee.id}</p>
                        <p><strong>Email:</strong> ${employee.email || 'Not provided'}</p>
                        <p><strong>Position:</strong> ${employee.position}</p>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                        <button class="btn-close-profile">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(profileModal);

        const closeProfileBtn = profileModal.querySelector('.close-profile');
        closeProfileBtn.addEventListener('click', function() {
            profileModal.remove();
        });

        const closeBtn = profileModal.querySelector('.btn-close-profile');
        closeBtn.addEventListener('click', function() {
            profileModal.remove();
        });

        window.addEventListener('click', function(event) {
            if (event.target === profileModal) {
                profileModal.remove();
            }
        });
    }
    
    viewDetailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const name = this.closest('.employee-item').querySelector('h3').textContent;
            showModal(`Viewing details for ${name}`);
        });
    });
    
    messageButtons.forEach(button => {
        button.addEventListener('click', function() {
            const name = this.closest('.employee-item').querySelector('h3').textContent;
            showModal(`Sending message to ${name}`);
        });
    });
});
