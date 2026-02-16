import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from datetime import datetime, timedelta
import os
import urllib.request
import urllib.parse

# Load data
try:
    with open('data.json', 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print("data.json not found.")
    exit(0)

today = datetime.now()
threshold = today + timedelta(days=30)
due_items = []
overdue_count = 0
soon_count = 0
ok_count = 0
overdue_categories = {}

# Process items for text list and charts
for item in data.get('items', []):
    try:
        next_due = datetime.strptime(item.get('next_due'), '%Y-%m-%d')
        diff_days = (next_due - today).days
        
        # Populate text list
        if next_due <= threshold:
            due_items.append(item)
            
        # Tally for House Health Chart
        if diff_days < 0:
            overdue_count += 1
            cat = item.get('category', 'Other')
            overdue_categories[cat] = overdue_categories.get(cat, 0) + 1
        elif diff_days <= 30:
            soon_count += 1
        else:
            ok_count += 1
            
    except Exception:
        continue

if not due_items:
    print("Nothing due. Enjoy your Sunday!")
    exit(0)

due_items.sort(key=lambda x: x.get('next_due'))

# --- GENERATE CHARTS VIA QUICKCHART API ---
# 1. House Health Chart Config
health_config = {
    "type": "doughnut",
    "data": {
        "labels": ["Overdue", "Due Soon", "Good Standing"],
        "datasets": [{"data": [overdue_count, soon_count, ok_count], "backgroundColor": ["#dc3545", "#ffc107", "#28a745"]}]
    },
    "options": {
        "title": {"display": True, "text": "House Health", "fontSize": 16},
        "plugins": {"legend": {"position": "bottom"}}
    }
}
health_url = "https://quickchart.io/chart?w=400&h=250&c=" + urllib.parse.quote(json.dumps(health_config))

# 2. Overdue by Category Chart Config
cat_labels = list(overdue_categories.keys()) if overdue_categories else ["No Overdue Tasks"]
cat_data = list(overdue_categories.values()) if overdue_categories else [0]
cat_config = {
    "type": "bar",
    "data": {
        "labels": cat_labels,
        "datasets": [{"label": "Overdue Tasks", "data": cat_data, "backgroundColor": "#dc3545"}]
    },
    "options": {
        "title": {"display": True, "text": "Overdue by Category", "fontSize": 16},
        "scales": {"yAxes": [{"ticks": {"beginAtZero": True, "stepSize": 1}}]},
        "plugins": {"legend": {"display": False}}
    }
}
cat_url = "https://quickchart.io/chart?w=400&h=250&c=" + urllib.parse.quote(json.dumps(cat_config))

# Build Email HTML Structure
repo_owner = os.environ.get('GITHUB_REPOSITORY', 'owner/repo').split('/')[0]
repo_name = os.environ.get('GITHUB_REPOSITORY', 'owner/repo').split('/')[-1]
site_url = f"https://{repo_owner}.github.io/{repo_name}/"

html = f"""
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2>🏠 Home Maintenance Action Required</h2>
    <p>The following items need your attention:</p>
    <ul>
"""
for item in due_items:
    html += f"<li><strong>{item.get('name')}</strong> ({item.get('location', 'Unknown')}) - Due: {item.get('next_due')}</li>"

html += f"""
    </ul>
    
    <hr style="border: 1px solid #eee; margin: 30px 0;">
    <h2>📊 Your House at a Glance</h2>
    <div style="display: flex; flex-wrap: wrap; gap: 20px;">
        <img src="cid:health_chart" alt="House Health" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 8px;">
        <img src="cid:cat_chart" alt="Overdue by Category" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 8px;">
    </div>
    
    <br><br>
    <a href="{site_url}" 
       style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
       Open Dashboard
    </a>
  </body>
</html>
"""

# Construct the complicated "Multipart/Related" email to allow inline attachments
msg = MIMEMultipart("related")
msg['Subject'] = "🏠 Home Maintenance Due"
msg['From'] = os.environ.get('EMAIL_SENDER')
msg['To'] = os.environ.get('EMAIL_RECEIVER')

msg_alternative = MIMEMultipart('alternative')
msg.attach(msg_alternative)
msg_alternative.attach(MIMEText(html, 'html'))

# Download and attach the images
def attach_image(url, cid):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            image_data = response.read()
        image_part = MIMEImage(image_data)
        image_part.add_header('Content-ID', f'<{cid}>')
        image_part.add_header('Content-Disposition', 'inline', filename=f'{cid}.png')
        msg.attach(image_part)
    except Exception as e:
        print(f"Failed to fetch {cid} chart: {e}")

print("Generating and downloading charts...")
attach_image(health_url, 'health_chart')
attach_image(cat_url, 'cat_chart')

# Send Email via SendGrid
try:
    print("Connecting to SendGrid...")
    server = smtplib.SMTP('smtp.sendgrid.net', 587)
    server.starttls()
    server.login('apikey', os.environ.get('EMAIL_PASSWORD'))
    server.sendmail(os.environ.get('EMAIL_SENDER'), [msg['To']], msg.as_string())
    server.quit()
    print("✅ Reminder email with charts sent successfully via SendGrid!")
except Exception as e:
    print(f"❌ Error sending email: {e}")
    exit(1)
