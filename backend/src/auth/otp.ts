/**
 * OTP Generation and Email Service
 * Uses FormSubmit.co to send OTP codes via email
 */

export interface OTPResult {
  success: boolean;
  message?: string;
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOTP(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return code.toString();
}

/**
 * Send OTP via FormSubmit.co
 * FormSubmit.co endpoint: https://formsubmit.co/{email}
 * 
 * Note: FormSubmit.co requires email confirmation on first use.
 * For production, you should:
 * 1. Create a dedicated sender email (e.g., noreply@inspire.app)
 * 2. Confirm it with FormSubmit.co
 * 3. Store the endpoint URL in environment variables
 */
export async function sendOTPEmail(recipientEmail: string, otpCode: string): Promise<OTPResult> {
  try {
    // FormSubmit.co configuration
    const formSubmitEndpoint = process.env.FORMSUBMIT_ENDPOINT || 'https://formsubmit.co/ajax/noreply@inspire.app';
    
    const emailBody = `
      <h2>Your Inspire Verification Code</h2>
      <p>Your one-time verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${otpCode}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <br>
      <p style="color: #666; font-size: 12px;">- The Inspire Team</p>
    `;
    
    const formData = {
      _subject: 'Your Inspire Verification Code',
      _template: 'box',
      _captcha: 'false',
      to: recipientEmail,
      message: emailBody
    };
    
    const response = await fetch(formSubmitEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      console.error('[OTP] FormSubmit.co failed:', response.status, response.statusText);
      return { success: false, message: 'Failed to send email' };
    }
    
    const result = await response.json();
    console.log('[OTP] Email sent successfully to', recipientEmail);
    return { success: true };
    
  } catch (error) {
    console.error('[OTP] Error sending email:', error);
    
    // Fallback: Log OTP to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n===========================================');
      console.log('🔐 DEVELOPMENT MODE - OTP CODE');
      console.log('===========================================');
      console.log(`Email: ${recipientEmail}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log('===========================================\n');
      return { success: true, message: 'Development mode - check console for OTP' };
    }
    
    return { success: false, message: 'Unable to send email' };
  }
}

/**
 * Mock OTP sender for testing
 */
export async function sendOTPEmailMock(recipientEmail: string, otpCode: string): Promise<OTPResult> {
  console.log('\n===========================================');
  console.log('📧 MOCK EMAIL - OTP CODE');
  console.log('===========================================');
  console.log(`To: ${recipientEmail}`);
  console.log(`Subject: Your Inspire Verification Code`);
  console.log(`Code: ${otpCode}`);
  console.log(`Expires: 10 minutes`);
  console.log('===========================================\n');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true, message: 'Mock email sent - check console' };
}
