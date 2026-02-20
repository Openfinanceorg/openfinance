import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  async send(params: {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
  }) {
    const { data, error } = await resend.emails.send(params);
    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    return data;
  }
}

export const emailService = new EmailService();
