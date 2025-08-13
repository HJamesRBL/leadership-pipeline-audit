import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateReminderEmail } from '../../../../lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { auditId, auditName, incompleteLeaders, fromEmail = 'audit@rblgroup.com', fromName = 'The RBL Group' } = await request.json();

    if (!auditId || !auditName || !incompleteLeaders || !Array.isArray(incompleteLeaders)) {
      return NextResponse.json(
        { error: 'Missing required fields: auditId, auditName, incompleteLeaders' },
        { status: 400 }
      );
    }

    if (incompleteLeaders.length === 0) {
      return NextResponse.json({
        success: true,
        summary: {
          total: 0,
          sent: 0,
          failed: 0
        },
        results: [],
        message: 'No incomplete leaders to remind - all audits are complete!'
      });
    }

    const emailResults = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const leader of incompleteLeaders) {
      try {
        const { name, email, employees, token } = leader;
        
        if (!name || !email || !employees || !token) {
          emailResults.push({
            leaderName: name || 'Unknown',
            email: email || 'Unknown',
            status: 'failed',
            error: 'Missing required leader data (name, email, employees, or token)'
          });
          continue;
        }

        // Generate the audit link
        const auditLink = `${appUrl}/audit/${token}`;

        // Generate reminder email content
        const emailContent = generateReminderEmail({
          leaderName: name,
          auditName: auditName,
          auditLink: auditLink,
          employeeCount: employees.length,
          employeeNames: employees
        });

        // Send reminder email via Resend
        const emailResponse = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          tags: [
            { name: 'type', value: 'audit-reminder' },
            { name: 'audit-id', value: auditId.toString() }
          ]
        });

        emailResults.push({
          leaderName: name,
          email: email,
          status: 'sent',
          messageId: emailResponse.data?.id,
          auditLink: auditLink
        });

      } catch (emailError) {
        console.error(`Failed to send reminder to ${leader.email}:`, emailError);
        emailResults.push({
          leaderName: leader.name || 'Unknown',
          email: leader.email || 'Unknown',
          status: 'failed',
          error: emailError instanceof Error ? emailError.message : 'Unknown email error'
        });
      }
    }

    // Count successes and failures
    const sent = emailResults.filter(r => r.status === 'sent').length;
    const failed = emailResults.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: incompleteLeaders.length,
        sent: sent,
        failed: failed
      },
      results: emailResults
    });

  } catch (error) {
    console.error('Send reminders API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}