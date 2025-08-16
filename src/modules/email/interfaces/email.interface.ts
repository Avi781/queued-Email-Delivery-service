export interface IEmailJobPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from: string;
}
