import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateInvitationEmail } from '../../../../lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { auditId, auditName, auditLeaders, fromEmail = 'audit@rblgroup.com', fromName = 'The RBL Group' } = await request.json();

    if (!auditId || !auditName || !auditLeaders || !Array.isArray(auditLeaders)) {
      return NextResponse.json(
        { error: 'Missing required fields: auditId, auditName, auditLeaders' },
        { status: 400 }
      );
    }

    const emailResults = [];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const leader of auditLeaders) {
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

        // Generate email content
        const emailContent = generateInvitationEmail({
          leaderName: name,
          auditName: auditName,
          auditLink: auditLink,
          employeeCount: employees.length,
          employeeNames: employees
        });

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          tags: [
            { name: 'type', value: 'audit-invitation' },
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
        console.error(`Failed to send email to ${leader.email}:`, emailError);
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
        total: auditLeaders.length,
        sent: sent,
        failed: failed
      },
      results: emailResults
    });

  } catch (error) {
    console.error('Send invitations API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send invitations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}