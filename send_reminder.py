import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
import os

# Load data
try:
    with open('data.json', 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print("data.json not found.")
    exit(0)

today = datetime.now()
# Look ahead 30 days
threshold = today + timedelta(days=30)
due_items = []

# Find items due within 30 days or overdue
for item in data.get('items', []):
    try:
        next_due = datetime.strptime(item.get('next_due'), '%Y-%m-%d')
        if next_due <= threshold:
            due_items.append(item)
    except Exception:
        continue

if not due_items:
    print("Nothing due. Enjoy your Sunday!")
    exit(0)

# Sort items chronologically
due_items.sort(key=lambda x: x.get('next_due'))

# Build Email HTML
html = """
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2>🏠 Home Maintenance Action Required</h2>
    <p>The following items are due for maintenance:</p>
    <ul>
"""
for item in due_items:
    html += f"<li><strong>{item.get('name')}</strong> ({item.get('location', 'Unknown')}) - Due: {item.get('next_due')}</li>"

# Add a link to your GitHub Pages site
repo_owner = os.environ.get('GITHUB_REPOSITORY').split('/')[0]
repo_name = os.environ.get('GITHUB_REPOSITORY').split('/')[1]
site_url = f"https://{repo_owner}.github.io/{repo_name}/"

html += f"""
    </ul>
    <br>
    <a href="{site_url}" 
       style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
       Open Dashboard
    </a>
  </body>
</html>
"""

msg = MIMEMultipart("alternative")
msg['Subject'] = "🏠 Home Maintenance Due"
msg['From'] = os.environ.get('EMAIL_SENDER')
msg['To'] = os.environ.get('EMAIL_RECEIVER')
msg.attach(MIMEText(html, 'html'))

# 4. Send Email via SendGrid
try:
    print("Connecting to SendGrid...")
    # SendGrid uses port 587
    server = smtplib.SMTP('smtp.sendgrid.net', 587)
    server.starttls()
    
    # IMPORTANT: The username is literally the string "apikey", NOT your email address!
    server.login('apikey', os.environ.get('EMAIL_PASSWORD'))
    
    server.sendmail(os.environ.get('EMAIL_SENDER'), [msg['To']], msg.as_string())
    server.quit()
    print("✅ Reminder email sent successfully via SendGrid!")
except Exception as e:
    print(f"❌ Error sending email: {e}")
    exit(1)

