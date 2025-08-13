interface EmailTemplateData {
  leaderName: string;
  auditName: string;
  auditLink: string;
  employeeCount: number;
  employeeNames: string[];
  dueDate?: string;
}

export const generateInvitationEmail = (data: EmailTemplateData) => {
  const { leaderName, auditName, auditLink, employeeCount, employeeNames, dueDate } = data;
  
  const employeeList = employeeNames.length <= 5 
    ? employeeNames.join(', ')
    : `${employeeNames.slice(0, 5).join(', ')} and ${employeeNames.length - 5} others`;

  const dueDateText = dueDate ? `Please complete your ratings by ${dueDate}.` : 'Please complete your ratings at your earliest convenience.';

  return {
    subject: `Pipeline Audit Invitation: ${auditName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pipeline Audit Invitation</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #071D49 0%, #0086D6 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 30px 20px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #071D49;
          }
          .audit-details {
            background-color: #f8f9fa;
            border-left: 4px solid #0086D6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
          }
          .audit-details h3 {
            margin: 0 0 10px 0;
            color: #071D49;
            font-size: 16px;
          }
          .employee-list {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #071D49 0%, #0086D6 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(7, 29, 73, 0.2);
          }
          .cta-button:hover {
            opacity: 0.9;
          }
          .instructions {
            background-color: #fff8e1;
            border: 1px solid #ffcc02;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .instructions h4 {
            margin: 0 0 10px 0;
            color: #e65100;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
          }
          .link-backup {
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #666;
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>The RBL Group</h1>
            <p>Pipeline Audit System</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hello ${leaderName},
            </div>
            
            <p>You have been selected to participate as an audit leader in our leadership pipeline assessment. Your insights and expertise are valuable to this important organizational development initiative.</p>
            
            <div class="audit-details">
              <h3>📊 Audit Details</h3>
              <p><strong>Audit Name:</strong> ${auditName}</p>
              <p><strong>Your Role:</strong> Audit Leader</p>
              <p><strong>Employees to Rate:</strong> ${employeeCount} employee${employeeCount !== 1 ? 's' : ''}</p>
            </div>
            
            <div class="employee-list">
              <strong>📋 You will be rating:</strong><br>
              ${employeeList}
            </div>
            
            <p>${dueDateText}</p>
            
            <div style="text-align: center;">
              <a href="${auditLink}" class="cta-button">
                🚀 Start Your Audit Assessment
              </a>
            </div>
            
            <div class="instructions">
              <h4>📝 What to Expect:</h4>
              <ul>
                <li><strong>Step 1:</strong> Assign career stages (1-4) for each employee</li>
                <li><strong>Step 2:</strong> Rank employee performance using drag-and-drop</li>
                <li><strong>Time Required:</strong> Approximately 5-10 minutes per employee</li>
                <li><strong>Access:</strong> No password required - your link is secure and unique</li>
              </ul>
            </div>
            
            <p>If you have any questions about the assessment process or need assistance, please don't hesitate to reach out to your audit administrator.</p>
            
            <p style="margin-top: 30px;">Thank you for your participation in this important leadership development initiative.</p>
            
            <p>Best regards,<br>
            <strong>The RBL Group Team</strong></p>
            
            <div class="link-backup">
              <strong>Direct Link (if button doesn't work):</strong><br>
              ${auditLink}
            </div>
          </div>
          
          <div class="footer">
            <p>This email was sent as part of The RBL Group Pipeline Audit System.</p>
            <p>If you received this email in error, please disregard it.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${leaderName},

You have been selected to participate as an audit leader in our leadership pipeline assessment.

AUDIT DETAILS:
- Audit Name: ${auditName}
- Your Role: Audit Leader  
- Employees to Rate: ${employeeCount} employee${employeeCount !== 1 ? 's' : ''}

You will be rating: ${employeeList}

${dueDateText}

To complete your assessment, please visit:
${auditLink}

WHAT TO EXPECT:
- Step 1: Assign career stages (1-4) for each employee
- Step 2: Rank employee performance using drag-and-drop
- Time Required: Approximately 5-10 minutes per employee
- Access: No password required - your link is secure and unique

Thank you for your participation in this important leadership development initiative.

Best regards,
The RBL Group Team

---
This email was sent as part of The RBL Group Pipeline Audit System.
    `
  };
};

export const generateReminderEmail = (data: EmailTemplateData) => {
  const { leaderName, auditName, auditLink, employeeCount, dueDate } = data;
  
  const dueDateText = dueDate ? `by ${dueDate}` : 'soon';

  return {
    subject: `Reminder: Pipeline Audit Pending - ${auditName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pipeline Audit Reminder</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
            color: white;
            padding: 25px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 25px 20px;
          }
          .reminder-notice {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            text-align: center;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #071D49 0%, #0086D6 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(7, 29, 73, 0.2);
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Audit Reminder</h1>
            <p>The RBL Group Pipeline Audit System</p>
          </div>
          
          <div class="content">
            <p>Hello ${leaderName},</p>
            
            <div class="reminder-notice">
              <strong>📋 Your pipeline audit assessment is still pending</strong><br>
              <em>${auditName}</em>
            </div>
            
            <p>This is a friendly reminder that your audit assessment for <strong>${employeeCount} employee${employeeCount !== 1 ? 's' : ''}</strong> is awaiting completion ${dueDateText}.</p>
            
            <p>Your participation is important for the success of this leadership development initiative.</p>
            
            <div style="text-align: center;">
              <a href="${auditLink}" class="cta-button">
                📝 Complete Your Assessment Now
              </a>
            </div>
            
            <p><strong>Time Required:</strong> Approximately ${employeeCount * 7} minutes</p>
            
            <p>If you're experiencing any technical difficulties or have questions, please contact your audit administrator.</p>
            
            <p>Thank you for your attention to this matter.</p>
            
            <p>Best regards,<br>
            <strong>The RBL Group Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This reminder was sent as part of The RBL Group Pipeline Audit System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${leaderName},

AUDIT REMINDER: ${auditName}

Your pipeline audit assessment is still pending completion ${dueDateText}.

You need to rate ${employeeCount} employee${employeeCount !== 1 ? 's' : ''}.
Estimated time: ${employeeCount * 7} minutes

To complete your assessment, please visit:
${auditLink}

Your participation is important for the success of this leadership development initiative.

If you're experiencing any difficulties, please contact your audit administrator.

Thank you for your attention to this matter.

Best regards,
The RBL Group Team
    `
  };
};