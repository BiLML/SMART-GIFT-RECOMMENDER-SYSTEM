import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "LUMINA <noreply@lumina.io>")

def send_reset_email(to_email: str, token: str):
    reset_link = f"http://localhost:3000/reset-password?token={token}"
    
    subject = "Khôi phục mật khẩu - LUMINA"
    body = f"""
    Chào bạn,
    
    Bạn nhận được email này vì chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.
    
    Vui lòng nhấp vào liên kết bên dưới để đặt lại mật khẩu:
    {reset_link}
    
    Liên kết này sẽ hết hạn sau 30 phút.
    
    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
    
    Trân trọng,
    Đội ngũ LUMINA
    """

    # If no SMTP credentials, just print to console for development
    if not SMTP_USER or not SMTP_PASS:
        print("\n" + "="*50)
        print(f"DEV MODE: GỬI EMAIL ĐẾN {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print("="*50 + "\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Lỗi khi gửi email: {e}")
        return False

def send_notification_email(to_email: str, subject: str, body: str):
    # If no SMTP credentials, just print to console for development
    if not SMTP_USER or not SMTP_PASS:
        print("\n" + "="*50)
        print(f"DEV MODE: GỬI THÔNG BÁO ĐẾN {to_email}")
        print(f"Subject: {subject}")
        print(f"Body: {body}")
        print("="*50 + "\n")
        return True

    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Lỗi khi gửi email thông báo: {e}")
        return False
