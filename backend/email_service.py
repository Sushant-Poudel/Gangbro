"""
Email Service Module
Handles all email notifications for the platform
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Email configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "noreply@gameshopnepal.com")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "GameShop Nepal")

def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None):
    """Send email via SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured. Email not sent.")
        return False
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        
        # Add text and HTML versions
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def get_order_confirmation_email(order_data: dict) -> tuple:
    """Generate order confirmation email"""
    subject = f"Order Confirmation - #{order_data.get('takeapp_order_number', order_data['id'][:8])}"
    
    items_html = ""
    for item in order_data.get("items", []):
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #2a2a2a;">{item['name']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #2a2a2a; text-align: center;">{item.get('quantity', 1)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #2a2a2a; text-align: right;">Rs {item['price']}</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #000000; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
                <h1 style="margin: 0; color: #F5A623; font-size: 28px; font-weight: bold;">GSN</h1>
                <p style="margin: 10px 0 0; color: #888;">GameShop Nepal</p>
            </div>
            
            <!-- Order Confirmation -->
            <div style="padding: 30px 0;">
                <h2 style="color: #F5A623; margin: 0 0 20px;">Order Confirmed! 🎉</h2>
                <p style="color: #cccccc; line-height: 1.6;">
                    Thank you for your order! We're processing it and you'll receive your digital products shortly.
                </p>
            </div>
            
            <!-- Order Details -->
            <div style="background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #F5A623; margin: 0 0 15px;">Order Details</h3>
                <p style="margin: 5px 0; color: #cccccc;"><strong>Order ID:</strong> {order_data.get('takeapp_order_number', order_data['id'][:8])}</p>
                <p style="margin: 5px 0; color: #cccccc;"><strong>Date:</strong> {order_data.get('created_at', '')[:10]}</p>
                <p style="margin: 5px 0; color: #cccccc;"><strong>Customer:</strong> {order_data.get('customer_name')}</p>
            </div>
            
            <!-- Items Table -->
            <div style="margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; background: #0A0A0A; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #1a1a1a;">
                            <th style="padding: 12px; text-align: left; color: #F5A623;">Item</th>
                            <th style="padding: 12px; text-align: center; color: #F5A623;">Qty</th>
                            <th style="padding: 12px; text-align: right; color: #F5A623;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                        <tr>
                            <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold; color: #F5A623;">Total:</td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; color: #F5A623; font-size: 18px;">Rs {order_data.get('total_amount')}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Payment Link -->
            {f'''
            <div style="text-align: center; margin: 30px 0;">
                <a href="{order_data.get('payment_url')}" 
                   style="display: inline-block; background: #F5A623; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    Complete Payment
                </a>
            </div>
            ''' if order_data.get('payment_url') else ''}
            
            <!-- Footer -->
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 30px;">
                <p style="color: #888; margin: 5px 0;">Questions? Contact us on WhatsApp</p>
                <p style="color: #888; margin: 5px 0;">+977 9743488871</p>
                <p style="color: #666; margin: 20px 0 5px; font-size: 12px;">GameShop Nepal - Your Trusted Digital Store</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    ORDER CONFIRMATION
    
    Thank you for your order at GameShop Nepal!
    
    Order ID: {order_data.get('takeapp_order_number', order_data['id'][:8])}
    Customer: {order_data.get('customer_name')}
    Total: Rs {order_data.get('total_amount')}
    
    Items:
    {order_data.get('items_text')}
    
    {f"Payment Link: {order_data.get('payment_url')}" if order_data.get('payment_url') else ''}
    
    For support, contact us on WhatsApp: +977 9743488871
    
    GameShop Nepal
    """
    
    return subject, html, text


def get_order_status_update_email(order_data: dict, new_status: str) -> tuple:
    """Generate order status update email"""
    status_messages = {
        "pending": "Your order is pending confirmation",
        "processing": "We're preparing your order!",
        "completed": "Your order is complete! 🎉",
        "cancelled": "Your order has been cancelled"
    }
    
    subject = f"Order Update - {status_messages.get(new_status, 'Status Updated')}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #000000; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
                <h1 style="margin: 0; color: #F5A623; font-size: 28px; font-weight: bold;">GSN</h1>
            </div>
            
            <div style="padding: 30px 0;">
                <h2 style="color: #F5A623; margin: 0 0 20px;">Order Status Update</h2>
                <p style="color: #cccccc; line-height: 1.6;">
                    {status_messages.get(new_status, 'Your order status has been updated')}
                </p>
            </div>
            
            <div style="background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px;">
                <p style="margin: 5px 0; color: #cccccc;"><strong>Order ID:</strong> {order_data.get('takeapp_order_number', order_data['id'][:8])}</p>
                <p style="margin: 5px 0; color: #cccccc;"><strong>Status:</strong> <span style="color: #F5A623;">{new_status.upper()}</span></p>
            </div>
            
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 30px;">
                <p style="color: #888;">Questions? Contact us on WhatsApp: +977 9743488871</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    ORDER STATUS UPDATE
    
    {status_messages.get(new_status, 'Your order status has been updated')}
    
    Order ID: {order_data.get('takeapp_order_number', order_data['id'][:8])}
    Status: {new_status.upper()}
    
    For support, contact us on WhatsApp: +977 9743488871
    
    GameShop Nepal
    """
    
    return subject, html, text


def get_welcome_email(customer_name: str) -> tuple:
    """Generate welcome email for new customers"""
    subject = "Welcome to GameShop Nepal! 🎉"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #000000; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
                <h1 style="margin: 0; color: #F5A623; font-size: 32px; font-weight: bold;">Welcome to GSN! 🎉</h1>
            </div>
            
            <div style="padding: 30px 0;">
                <p style="color: #cccccc; font-size: 18px;">Hi {customer_name},</p>
                <p style="color: #cccccc; line-height: 1.8;">
                    Thank you for choosing GameShop Nepal! We're excited to have you as part of our community.
                </p>
                <p style="color: #cccccc; line-height: 1.8;">
                    Explore our wide range of digital products including streaming subscriptions, gaming top-ups, 
                    and software licenses - all at the best prices in Nepal with instant delivery!
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{os.environ.get('SITE_URL', 'https://gameshopnepal.com')}" 
                   style="display: inline-block; background: #F5A623; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                    Start Shopping
                </a>
            </div>
            
            <div style="background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #F5A623; margin: 0 0 15px;">Why Choose Us?</h3>
                <ul style="color: #cccccc; line-height: 2;">
                    <li>✅ Instant Digital Delivery</li>
                    <li>✅ 100% Genuine Products</li>
                    <li>✅ Best Prices in Nepal</li>
                    <li>✅ 24/7 Customer Support</li>
                </ul>
            </div>
            
            <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 30px;">
                <p style="color: #888;">Need help? WhatsApp us: +977 9743488871</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text = f"""
    WELCOME TO GAMESHOP NEPAL!
    
    Hi {customer_name},
    
    Thank you for choosing GameShop Nepal! We're excited to have you.
    
    Explore our digital products:
    - Streaming Services (Netflix, Spotify, YouTube Premium)
    - Gaming Top-ups (PUBG UC, Free Fire, Steam)
    - Software & Gift Cards
    
    Visit: https://team-gangbdo.preview.emergentagent.com
    
    Need help? WhatsApp: +977 9743488871
    
    GameShop Nepal
    """
    
    return subject, html, text
