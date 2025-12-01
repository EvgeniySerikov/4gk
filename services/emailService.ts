
import { AppSettings } from "../types";

/**
 * Sends an email using EmailJS REST API.
 */
export const sendStatusEmail = async (
  settings: AppSettings, 
  toEmail: string, 
  toName: string, 
  statusText: string, 
  feedback?: string
): Promise<boolean> => {
  
  if (!settings.emailJsServiceId || !settings.emailJsTemplateId || !settings.emailJsPublicKey) {
    console.warn("EmailJS credentials not set. Skipping email.");
    return false;
  }

  if (!toEmail) return false;

  const endpoint = "https://api.emailjs.com/api/v1.0/email/send";

  const templateParams = {
    to_email: toEmail,
    to_name: toName,
    status: statusText,
    feedback: feedback || "Без дополнительных комментариев",
    game_name: "Что? Где? Когда? Батуми",
    from_name: "ЧГК Батуми"
  };

  const payload = {
    service_id: settings.emailJsServiceId,
    template_id: settings.emailJsTemplateId,
    user_id: settings.emailJsPublicKey,
    template_params: templateParams
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("Email sent successfully");
      return true;
    } else {
      const errorText = await response.text();
      console.error("EmailJS Error:", errorText);
      alert(`Ошибка отправки Email: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error("Network Error sending email:", error);
    return false;
  }
};
