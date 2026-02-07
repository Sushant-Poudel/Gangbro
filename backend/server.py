from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Body, Request, Header
import fastapi
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
import secrets
import shutil
import httpx
from email_service import send_email, get_order_confirmation_email, get_order_status_update_email, get_welcome_email


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== RATE LIMITING ====================
from collections import defaultdict
from time import time

# In-memory rate limiter (for production, use Redis)
rate_limit_store = defaultdict(list)

def rate_limit_check(ip: str, limit: int = 100, window: int = 60):
    """Check if IP is rate limited. Returns True if allowed, False if limited."""
    now = time()
    # Clean old requests
    rate_limit_store[ip] = [req_time for req_time in rate_limit_store[ip] if now - req_time < window]
    
    if len(rate_limit_store[ip]) >= limit:
        return False
    
    rate_limit_store[ip].append(now)
    return True

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    client_ip = request.client.host
    
    # Skip rate limiting for health checks
    if request.url.path == "/health":
        return await call_next(request)
    
    # More relaxed for login endpoints (30 attempts per minute)
    if "/auth/login" in request.url.path:
        if not rate_limit_check(client_ip, limit=30, window=60):
            return fastapi.responses.JSONResponse(
                status_code=429,
                content={"detail": "Too many login attempts. Please try again later."}
            )
    else:
        # General rate limit
        if not rate_limit_check(client_ip, limit=100, window=60):
            return fastapi.responses.JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."}
            )
    
    return await call_next(request)

# ==================== SECURITY HEADERS ====================
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str = "Admin"

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    is_admin: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# Customer Models
class CustomerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None

class OTPRequest(BaseModel):
    email: str
    name: Optional[str] = None

class OTPVerify(BaseModel):
    email: str
    otp: str

class OTPRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    otp: str
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified: bool = False


class ProductVariation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    original_price: Optional[float] = None
    description: Optional[str] = None

class ProductFormField(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    placeholder: str = ""
    required: bool = False

class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None  # Custom slug, auto-generated if not provided
    description: str
    image_url: str
    category_id: str
    variations: List[ProductVariation] = []
    tags: List[str] = []
    sort_order: int = 0
    custom_fields: List[ProductFormField] = []
    is_active: bool = True
    is_sold_out: bool = False
    stock_quantity: Optional[int] = None  # None means unlimited
    flash_sale_end: Optional[str] = None  # ISO datetime when flash sale ends
    flash_sale_label: Optional[str] = None  # e.g., "FLASH SALE - 50% OFF"

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: Optional[str] = None
    description: str
    image_url: str
    category_id: str
    variations: List[ProductVariation] = []
    tags: List[str] = []
    sort_order: int = 0
    custom_fields: List[ProductFormField] = []
    is_active: bool = True
    is_sold_out: bool = False
    stock_quantity: Optional[int] = None  # None means unlimited
    flash_sale_end: Optional[str] = None  # ISO datetime when flash sale ends
    flash_sale_label: Optional[str] = None  # e.g., "FLASH SALE - 50% OFF"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductOrderUpdate(BaseModel):
    product_ids: List[str]

class ReviewCreate(BaseModel):
    reviewer_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    review_date: Optional[str] = None

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reviewer_name: str
    rating: int
    comment: str
    review_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: Optional[str] = None

class PageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    page_key: str
    title: str
    content: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SocialLinkCreate(BaseModel):
    platform: str
    url: str
    icon: Optional[str] = None

class SocialLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: str
    url: str
    icon: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str

class FAQItemCreate(BaseModel):
    question: str
    answer: str
    category: str = "General"
    sort_order: int = 0

class FAQItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: str
    category: str = "General"
    sort_order: int = 0

class FAQReorderRequest(BaseModel):
    faq_ids: List[str]

# Promo Code Models
class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # "percentage", "fixed", "buy_x_get_y", "free_shipping"
    discount_value: float
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    max_uses_per_customer: Optional[int] = None
    is_active: bool = True
    expiry_date: Optional[str] = None
    applicable_categories: List[str] = []  # Empty means all categories
    applicable_products: List[str] = []  # Empty means all products
    first_time_only: bool = False
    buy_quantity: Optional[int] = None  # For "buy X get Y" offers
    get_quantity: Optional[int] = None
    auto_apply: bool = False  # Auto-apply if conditions met
    stackable: bool = False  # Can be combined with other promos

class PromoCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    max_uses_per_customer: Optional[int] = None
    used_count: int = 0
    is_active: bool = True
    expiry_date: Optional[str] = None
    applicable_categories: List[str] = []
    applicable_products: List[str] = []
    first_time_only: bool = False
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    auto_apply: bool = False
    stackable: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ==================== ADMIN CREDENTIALS FROM ENV ====================
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "gsnadmin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "gsnadmin")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id == "admin-fixed":
            return {
                "id": "admin-fixed",
                "email": ADMIN_USERNAME,
                "name": "Admin",
                "is_admin": True
            }
        raise HTTPException(status_code=401, detail="Invalid user")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    raise HTTPException(status_code=403, detail="Registration disabled. Use admin credentials.")

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    if credentials.email == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        token = create_token("admin-fixed")
        return {
            "token": token,
            "user": {
                "id": "admin-fixed",
                "email": ADMIN_USERNAME,
                "name": "Admin",
                "is_admin": True
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user



# ==================== CUSTOMER AUTH ROUTES ====================

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(secrets.randbelow(900000) + 100000)

@api_router.post("/auth/customer/send-otp")
async def send_customer_otp(request: OTPRequest):
    """Send OTP to customer email"""
    email = request.email.lower().strip()
    
    # Check if customer exists, if not create profile
    customer = await db.customers.find_one({"email": email})
    if not customer:
        customer_data = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": request.name or email.split("@")[0],
            "phone": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None
        }
        await db.customers.insert_one(customer_data)
        logger.info(f"New customer created: {email}")
    
    # Generate OTP
    otp = generate_otp()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    
    # Store OTP
    otp_record = OTPRecord(
        email=email,
        otp=otp,
        expires_at=expires_at
    )
    
    # Delete old OTPs for this email
    await db.otp_records.delete_many({"email": email})
    await db.otp_records.insert_one(otp_record.model_dump())
    
    # Send OTP via email
    try:
        subject = f"Your GSN Login Code: {otp}"
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
                    <h1 style="margin: 0; color: #F5A623; font-size: 32px; font-weight: bold;">GSN</h1>
                    <p style="margin: 10px 0 0; color: #888;">GameShop Nepal</p>
                </div>
                
                <div style="padding: 40px 0; text-align: center;">
                    <h2 style="color: #F5A623; margin: 0 0 20px;">Your Login Code</h2>
                    <p style="color: #cccccc; margin-bottom: 30px;">Use this code to log in to your account:</p>
                    
                    <div style="background: linear-gradient(145deg, #1a1a1a, #0a0a0a); border: 2px solid #F5A623; border-radius: 12px; padding: 30px; margin: 20px 0;">
                        <div style="font-size: 48px; font-weight: bold; color: #F5A623; letter-spacing: 8px; font-family: monospace;">
                            {otp}
                        </div>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; margin-top: 30px;">
                        This code expires in 10 minutes.
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a;">
                    <p style="color: #888; margin: 5px 0;">Questions? Contact us on WhatsApp</p>
                    <p style="color: #888; margin: 5px 0;">+977 9743488871</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        GSN - GAMESHOP NEPAL
        
        Your Login Code: {otp}
        
        This code expires in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Questions? WhatsApp: +977 9743488871
        """
        
        send_email(email, subject, html, text)
        logger.info(f"OTP sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
    
    # Return OTP in response if debug mode enabled (for testing without email)
    if os.environ.get("DEBUG_MODE") == "true":
        return {"message": "OTP sent (debug mode)", "otp": otp, "expires_in": "10 minutes"}
    
    return {"message": "OTP sent to your email", "expires_in": "10 minutes"}

@api_router.post("/auth/customer/verify-otp")
async def verify_customer_otp(verify: OTPVerify):
    """Verify OTP and create customer session"""
    email = verify.email.lower().strip()
    
    # Find OTP record
    otp_record = await db.otp_records.find_one({
        "email": email,
        "otp": verify.otp,
        "verified": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    
    # Mark OTP as verified
    await db.otp_records.update_one(
        {"id": otp_record["id"]},
        {"$set": {"verified": True}}
    )
    
    # Update customer last login
    await db.customers.update_one(
        {"email": email},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get customer profile
    customer = await db.customers.find_one({"email": email}, {"_id": 0})
    
    # If customer doesn't exist somehow, create it
    if not customer:
        customer = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": email.split("@")[0],
            "phone": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": datetime.now(timezone.utc).isoformat()
        }
        await db.customers.insert_one(customer)
    
    # Create JWT token for customer
    token = create_token(customer["id"])
    
    return {
        "token": token,
        "customer": customer,
        "message": "Login successful"
    }

async def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current logged-in customer"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        
        # Check if it's a customer
        customer = await db.customers.find_one({"id": user_id}, {"_id": 0})
        if customer:
            return customer
        
        raise HTTPException(status_code=401, detail="Invalid customer token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.get("/auth/customer/me")
async def get_customer_profile(current_customer: dict = Depends(get_current_customer)):
    """Get current customer profile"""
    return current_customer


# ==================== CUSTOMER ENDPOINTS ====================

@api_router.get("/customer/orders")
async def get_customer_orders(current_customer: dict = Depends(get_current_customer)):
    """Get customer's order history with status history"""
    orders = await db.orders.find(
        {"customer_email": current_customer["email"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Fetch status history for each order
    for order in orders:
        history = await db.order_status_history.find(
            {"order_id": order.get("id")},
            {"_id": 0}
        ).sort("created_at", 1).to_list(50)
        order["status_history"] = history
    
    return orders

@api_router.get("/customer/orders/{order_id}")
async def get_customer_order_detail(order_id: str, current_customer: dict = Depends(get_current_customer)):
    """Get specific order details"""
    order = await db.orders.find_one({
        "id": order_id,
        "customer_email": current_customer["email"]
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get status history
    history = await db.order_status_history.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    order["status_history"] = history
    return order

@api_router.get("/customer/stats")
async def get_customer_stats(current_customer: dict = Depends(get_current_customer)):
    """Get customer statistics"""
    email = current_customer["email"]
    
    # Count orders
    total_orders = await db.orders.count_documents({"customer_email": email})
    
    # Calculate total spent
    orders = await db.orders.find({"customer_email": email}).to_list(1000)
    total_spent = sum(order.get("total_amount", 0) for order in orders)
    
    # Count wishlist items
    wishlist_count = await db.wishlists.count_documents({"email": email})
    
    return {
        "total_orders": total_orders,
        "total_spent": total_spent,
        "wishlist_items": wishlist_count,
        "member_since": current_customer.get("created_at", "")[:10]
    }


@api_router.put("/auth/customer/profile")
async def update_customer_profile(name: str, phone: Optional[str] = None, current_customer: dict = Depends(get_current_customer)):
    """Update customer profile"""
    await db.customers.update_one(
        {"id": current_customer["id"]},
        {"$set": {"name": name, "phone": phone}}
    )
    
    updated = await db.customers.find_one({"id": current_customer["id"]}, {"_id": 0})
    return updated

# ==================== IMAGE UPLOAD ====================

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, WebP, GIF allowed.")

    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/api/uploads/{filename}"}

@api_router.get("/uploads/{filename}")
async def get_uploaded_image(filename: str):
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

# ==================== CATEGORY ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    slug = category_data.name.lower().replace(" ", "-").replace("&", "and")
    category = Category(name=category_data.name, slug=slug)
    await db.categories.insert_one(category.model_dump())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    slug = category_data.name.lower().replace(" ", "-").replace("&", "and")
    await db.categories.update_one({"id": category_id}, {"$set": {"name": category_data.name, "slug": slug}})
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== PRODUCT ROUTES ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(category_id: Optional[str] = None, active_only: bool = True):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if active_only:
        query["is_active"] = True

    products = await db.products.find(query, {"_id": 0}).sort([("sort_order", 1), ("created_at", -1)]).to_list(1000)
    return products

@api_router.get("/products/search/advanced")
async def advanced_product_search(
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    tags: Optional[str] = None,
    sort_by: str = "relevance",  # relevance, price_low, price_high, newest
    limit: int = 50
):
    """Advanced product search with filters"""
    query = {"is_active": True}
    
    # Text search
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]
    
    # Category filter
    if category_id:
        query["category_id"] = category_id
    
    # Tags filter
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    
    # Get products
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    
    # Price filter (done in Python since prices are in variations)
    if min_price is not None or max_price is not None:
        filtered = []
        for product in products:
            if product.get("variations"):
                prices = [v["price"] for v in product["variations"]]
                min_p = min(prices)
                max_p = max(prices)
                
                if min_price and max_p < min_price:
                    continue
                if max_price and min_p > max_price:
                    continue
                    
                filtered.append(product)
        products = filtered
    
    # Sorting
    if sort_by == "price_low":
        products.sort(key=lambda p: min([v["price"] for v in p.get("variations", [{"price": 0}])]))
    elif sort_by == "price_high":
        products.sort(key=lambda p: max([v["price"] for v in p.get("variations", [{"price": 0}])]), reverse=True)
    elif sort_by == "newest":
        products.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    
    return products[:limit]

@api_router.get("/products/search/suggestions")
async def search_suggestions(q: str, limit: int = 5):
    """Get search suggestions/autocomplete"""
    if not q or len(q) < 2:
        return []
    
    # Find matching products
    products = await db.products.find(
        {
            "is_active": True,
            "$or": [
                {"name": {"$regex": f"^{q}", "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0, "id": 1, "name": 1, "image_url": 1, "slug": 1}
    ).limit(limit).to_list(limit)
    
    return products


@api_router.put("/products/reorder")
async def reorder_products(order_data: ProductOrderUpdate, current_user: dict = Depends(get_current_user)):
    for index, product_id in enumerate(order_data.product_ids):
        await db.products.update_one({"id": product_id}, {"$set": {"sort_order": index}})
    return {"message": "Products reordered successfully"}

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    # First try to find by slug
    product = await db.products.find_one({"slug": product_id}, {"_id": 0})
    if not product:
        # Then try by ID
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/products/{product_id}/related")
async def get_related_products(product_id: str, limit: int = 4):
    """Get related products (same category or similar tags) - for 'Customers Also Bought' section"""
    # First get the current product
    product = await db.products.find_one({"$or": [{"slug": product_id}, {"id": product_id}]})
    if not product:
        return []
    
    related = []
    
    # Find products in same category
    same_category = await db.products.find({
        "category_id": product.get("category_id"),
        "id": {"$ne": product.get("id")},
        "is_active": True
    }, {"_id": 0}).limit(limit).to_list(limit)
    related.extend(same_category)
    
    # If not enough, find products with similar tags
    if len(related) < limit and product.get("tags"):
        with_tags = await db.products.find({
            "tags": {"$in": product.get("tags", [])},
            "id": {"$ne": product.get("id")},
            "id": {"$nin": [p.get("id") for p in related]},
            "is_active": True
        }, {"_id": 0}).limit(limit - len(related)).to_list(limit - len(related))
        related.extend(with_tags)
    
    # If still not enough, get any other products
    if len(related) < limit:
        others = await db.products.find({
            "id": {"$ne": product.get("id")},
            "id": {"$nin": [p.get("id") for p in related]},
            "is_active": True
        }, {"_id": 0}).limit(limit - len(related)).to_list(limit - len(related))
        related.extend(others)
    
    return related[:limit]

def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from product name"""
    import re
    # Convert to lowercase
    slug = name.lower()
    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    return slug

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    max_order = await db.products.find_one(sort=[("sort_order", -1)])
    next_order = (max_order.get("sort_order", 0) + 1) if max_order else 0

    product_dict = product_data.model_dump()
    product_dict["sort_order"] = next_order
    
    # Use custom slug if provided, otherwise auto-generate
    if product_data.slug and product_data.slug.strip():
        custom_slug = product_data.slug.strip().lower().replace(' ', '-')
        # Check if slug already exists
        existing_slug = await db.products.find_one({"slug": custom_slug})
        if existing_slug:
            raise HTTPException(status_code=400, detail="This URL slug is already in use. Please choose a different one.")
        product_dict["slug"] = custom_slug
    else:
        product_dict["slug"] = generate_slug(product_data.name)
    
    product = Product(**product_dict)
    await db.products.insert_one(product.model_dump())
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_data.model_dump()
    
    # Use custom slug if provided, otherwise keep existing or auto-generate
    if product_data.slug and product_data.slug.strip():
        custom_slug = product_data.slug.strip().lower().replace(' ', '-')
        # Check if slug is already used by another product
        existing_slug = await db.products.find_one({"slug": custom_slug, "id": {"$ne": product_id}})
        if existing_slug:
            raise HTTPException(status_code=400, detail="This URL slug is already in use. Please choose a different one.")
        update_data["slug"] = custom_slug
    else:
        # Keep existing slug or generate new one
        update_data["slug"] = existing.get("slug") or generate_slug(product_data.name)
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== REVIEW ROUTES ====================

@api_router.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews = await db.reviews.find({}, {"_id": 0}).sort("review_date", -1).to_list(1000)
    return reviews

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    review = Review(
        reviewer_name=review_data.reviewer_name,
        rating=review_data.rating,
        comment=review_data.comment,
        review_date=review_data.review_date or datetime.now(timezone.utc).isoformat()
    )
    await db.reviews.insert_one(review.model_dump())
    return review

@api_router.put("/reviews/{review_id}", response_model=Review)
async def update_review(review_id: str, review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.reviews.find_one({"id": review_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")

    update_data = review_data.model_dump()
    update_data["review_date"] = review_data.review_date or existing.get("review_date")
    await db.reviews.update_one({"id": review_id}, {"$set": update_data})
    updated = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return updated

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}

# ==================== TRUSTPILOT SYNC ====================

TRUSTPILOT_DOMAIN = "gameshopnepal.com"
TRUSTPILOT_API_KEY = os.environ.get("TRUSTPILOT_API_KEY", "")

async def get_trustpilot_business_unit_id():
    """Get the business unit ID from Trustpilot using the domain"""
    cached = await db.trustpilot_config.find_one({"key": "business_unit_id"})
    if cached and cached.get("value"):
        return cached["value"]
    
    # Try to find business unit ID via API or scraping
    async with httpx.AsyncClient() as client:
        try:
            # First try the public find endpoint (may need API key)
            if TRUSTPILOT_API_KEY:
                response = await client.get(
                    f"https://api.trustpilot.com/v1/business-units/find?name={TRUSTPILOT_DOMAIN}",
                    headers={"apikey": TRUSTPILOT_API_KEY},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    buid = data.get("id")
                    if buid:
                        await db.trustpilot_config.update_one(
                            {"key": "business_unit_id"},
                            {"$set": {"key": "business_unit_id", "value": buid}},
                            upsert=True
                        )
                        return buid
        except Exception as e:
            logger.error(f"Error getting business unit ID: {e}")
    
    return None

async def fetch_trustpilot_reviews_from_page():
    """Scrape reviews from Trustpilot page as fallback"""
    reviews = []
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://www.trustpilot.com/review/{TRUSTPILOT_DOMAIN}",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout=15.0
            )
            if response.status_code == 200:
                import re
                import json
                
                # Try to find JSON-LD data in the page
                html = response.text
                
                # Look for review data in script tags
                json_ld_pattern = r'<script type="application/ld\+json"[^>]*>(.*?)</script>'
                matches = re.findall(json_ld_pattern, html, re.DOTALL)
                
                for match in matches:
                    try:
                        data = json.loads(match)
                        if isinstance(data, dict) and data.get("@type") == "LocalBusiness":
                            if "review" in data:
                                for review in data["review"]:
                                    reviews.append({
                                        "reviewer_name": review.get("author", {}).get("name", "Anonymous"),
                                        "rating": int(review.get("reviewRating", {}).get("ratingValue", 5)),
                                        "comment": review.get("reviewBody", ""),
                                        "review_date": review.get("datePublished", datetime.now(timezone.utc).isoformat())
                                    })
                    except json.JSONDecodeError:
                        continue
                
                # Also try to parse from __NEXT_DATA__
                next_data_pattern = r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>'
                next_matches = re.findall(next_data_pattern, html, re.DOTALL)
                
                for match in next_matches:
                    try:
                        data = json.loads(match)
                        props = data.get("props", {}).get("pageProps", {})
                        review_list = props.get("reviews", [])
                        
                        for review in review_list:
                            consumer = review.get("consumer", {})
                            # Get the published date from dates object
                            dates = review.get("dates", {})
                            published_date = dates.get("publishedDate") or dates.get("experiencedDate")
                            
                            reviews.append({
                                "reviewer_name": consumer.get("displayName", "Anonymous"),
                                "rating": review.get("rating", 5),
                                "comment": review.get("text", review.get("title", "")),
                                "review_date": published_date or datetime.now(timezone.utc).isoformat()
                            })
                    except json.JSONDecodeError:
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping Trustpilot: {e}")
    
    return reviews

@api_router.post("/reviews/sync-trustpilot")
async def sync_trustpilot_reviews(current_user: dict = Depends(get_current_user)):
    """Sync reviews from Trustpilot to the database"""
    synced_count = 0
    
    try:
        # Try scraping the Trustpilot page
        trustpilot_reviews = await fetch_trustpilot_reviews_from_page()
        
        for tp_review in trustpilot_reviews:
            # Check if this review already exists (by reviewer name and comment)
            existing = await db.reviews.find_one({
                "reviewer_name": tp_review["reviewer_name"],
                "comment": tp_review["comment"],
                "source": "trustpilot"
            })
            
            if not existing:
                review = {
                    "id": f"tp-{str(uuid.uuid4())[:8]}",
                    "reviewer_name": tp_review["reviewer_name"],
                    "rating": tp_review["rating"],
                    "comment": tp_review["comment"],
                    "review_date": tp_review["review_date"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "source": "trustpilot"
                }
                await db.reviews.insert_one(review)
                synced_count += 1
        
        # Update last sync time
        await db.trustpilot_config.update_one(
            {"key": "last_sync"},
            {"$set": {"key": "last_sync", "value": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        return {
            "success": True,
            "synced_count": synced_count,
            "total_found": len(trustpilot_reviews),
            "message": f"Synced {synced_count} new reviews from Trustpilot"
        }
        
    except Exception as e:
        logger.error(f"Error syncing Trustpilot reviews: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync reviews: {str(e)}")

@api_router.get("/reviews/trustpilot-status")
async def get_trustpilot_status(current_user: dict = Depends(get_current_user)):
    """Get Trustpilot sync status"""
    last_sync = await db.trustpilot_config.find_one({"key": "last_sync"})
    tp_review_count = await db.reviews.count_documents({"source": "trustpilot"})
    
    return {
        "domain": TRUSTPILOT_DOMAIN,
        "last_sync": last_sync.get("value") if last_sync else None,
        "trustpilot_reviews_count": tp_review_count,
        "api_key_configured": bool(TRUSTPILOT_API_KEY)
    }

@api_router.get("/faqs", response_model=List[FAQItem])
async def get_faqs():
    faqs = await db.faqs.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return faqs

@api_router.post("/faqs", response_model=FAQItem)
async def create_faq(faq_data: FAQItemCreate, current_user: dict = Depends(get_current_user)):
    max_order = await db.faqs.find_one(sort=[("sort_order", -1)])
    next_order = (max_order.get("sort_order", 0) + 1) if max_order else 0

    faq = FAQItem(question=faq_data.question, answer=faq_data.answer, sort_order=next_order)
    await db.faqs.insert_one(faq.model_dump())
    return faq

@api_router.put("/faqs/reorder")
async def reorder_faqs(request: Request, current_user: dict = Depends(get_current_user)):
    faq_ids = await request.json()
    for index, faq_id in enumerate(faq_ids):
        await db.faqs.update_one({"id": faq_id}, {"$set": {"sort_order": index}})
    return {"message": "FAQs reordered successfully"}

@api_router.put("/faqs/{faq_id}", response_model=FAQItem)
async def update_faq(faq_id: str, faq_data: FAQItemCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.faqs.find_one({"id": faq_id})
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")

    await db.faqs.update_one({"id": faq_id}, {"$set": faq_data.model_dump()})
    updated = await db.faqs.find_one({"id": faq_id}, {"_id": 0})
    return updated

@api_router.delete("/faqs/{faq_id}")
async def delete_faq(faq_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.faqs.delete_one({"id": faq_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return {"message": "FAQ deleted"}

# ==================== PAGE ROUTES ====================

@api_router.get("/pages/{page_key}")
async def get_page(page_key: str):
    page = await db.pages.find_one({"page_key": page_key}, {"_id": 0})
    if not page:
        defaults = {
            "about": {"title": "About Us", "content": "<p>Welcome to GameShop Nepal - Your trusted source for digital products since 2021.</p>"},
            "terms": {"title": "Terms and Conditions", "content": "<p>Terms and conditions content here.</p>"},
            "faq": {"title": "FAQ", "content": ""}
        }
        return {"page_key": page_key, **defaults.get(page_key, {"title": page_key.title(), "content": ""})}
    return page

@api_router.put("/pages/{page_key}")
async def update_page(page_key: str, title: str, content: str, current_user: dict = Depends(get_current_user)):
    page_data = {
        "page_key": page_key,
        "title": title,
        "content": content,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pages.update_one({"page_key": page_key}, {"$set": page_data}, upsert=True)
    return page_data

# ==================== SOCIAL LINK ROUTES ====================

@api_router.get("/social-links", response_model=List[SocialLink])
async def get_social_links():
    links = await db.social_links.find({}, {"_id": 0}).to_list(100)
    return links

@api_router.post("/social-links", response_model=SocialLink)
async def create_social_link(link_data: SocialLinkCreate, current_user: dict = Depends(get_current_user)):
    link = SocialLink(**link_data.model_dump())
    await db.social_links.insert_one(link.model_dump())
    return link

@api_router.put("/social-links/{link_id}", response_model=SocialLink)
async def update_social_link(link_id: str, link_data: SocialLinkCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.social_links.find_one({"id": link_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Social link not found")

    await db.social_links.update_one({"id": link_id}, {"$set": link_data.model_dump()})
    updated = await db.social_links.find_one({"id": link_id}, {"_id": 0})
    return updated

@api_router.delete("/social-links/{link_id}")
async def delete_social_link(link_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.social_links.delete_one({"id": link_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Social link not found")
    return {"message": "Social link deleted"}

# ==================== CLEAR DATA ====================

@api_router.post("/clear-products")
async def clear_products(current_user: dict = Depends(get_current_user)):
    await db.products.delete_many({})
    await db.categories.delete_many({})
    return {"message": "All products and categories cleared"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    social_data = [
        {"id": "fb", "platform": "Facebook", "url": "https://facebook.com/gameshopnepal", "icon": "facebook"},
        {"id": "ig", "platform": "Instagram", "url": "https://instagram.com/gameshopnepal", "icon": "instagram"},
        {"id": "tt", "platform": "TikTok", "url": "https://tiktok.com/@gameshopnepal", "icon": "tiktok"},
        {"id": "wa", "platform": "WhatsApp", "url": "https://wa.me/9779743488871", "icon": "whatsapp"},
    ]

    for link in social_data:
        await db.social_links.update_one({"id": link["id"]}, {"$set": link}, upsert=True)

    reviews_data = [
        {"id": "rev1", "reviewer_name": "Sujan Thapa", "rating": 5, "comment": "Fast delivery and genuine products. Got my Netflix subscription within minutes!", "review_date": "2025-01-10T10:00:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev2", "reviewer_name": "Anisha Sharma", "rating": 5, "comment": "Best prices in Nepal for digital products. Highly recommended!", "review_date": "2025-01-08T14:30:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev3", "reviewer_name": "Rohan KC", "rating": 5, "comment": "Bought PUBG UC, instant delivery. Will buy again!", "review_date": "2025-01-05T09:15:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
    ]

    for rev in reviews_data:
        await db.reviews.update_one({"id": rev["id"]}, {"$set": rev}, upsert=True)

    default_faqs = [
        {"id": "faq1", "question": "How do I place an order?", "answer": "Simply browse our products, select the plan you want, and click 'Order Now'. This will redirect you to WhatsApp where you can complete your order.", "sort_order": 0},
        {"id": "faq2", "question": "How long does delivery take?", "answer": "Most products are delivered instantly within minutes after payment confirmation.", "sort_order": 1},
        {"id": "faq3", "question": "What payment methods do you accept?", "answer": "We accept eSewa, Khalti, bank transfer, and other local payment methods.", "sort_order": 2},
        {"id": "faq4", "question": "Are your products genuine?", "answer": "Yes! All our products are 100% genuine and sourced directly from authorized channels.", "sort_order": 3},
    ]

    for faq in default_faqs:
        await db.faqs.update_one({"id": faq["id"]}, {"$set": faq}, upsert=True)

    return {"message": "Data seeded successfully"}

# Order creation models
class OrderItem(BaseModel):
    name: str
    price: float
    quantity: int = 1
    variation: Optional[str] = None

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    remark: Optional[str] = None

@api_router.post("/orders/create")
async def create_order(order_data: CreateOrderRequest):
    order_id = str(uuid.uuid4())

    def format_phone_number(phone):
        phone = ''.join(filter(str.isdigit, phone))
        if phone.startswith('0'):
            phone = phone[1:]
        if not phone.startswith('977') and len(phone) == 10:
            phone = '977' + phone
        return phone

    formatted_phone = format_phone_number(order_data.customer_phone)

    items_text = ", ".join([f"{item.quantity}x {item.name}" + (f" ({item.variation})" if item.variation else "") for item in order_data.items])

    local_order = {
        "id": order_id,
        "customer_name": order_data.customer_name,
        "customer_phone": order_data.customer_phone,
        "customer_email": order_data.customer_email,
        "items": [item.model_dump() for item in order_data.items],
        "total_amount": order_data.total_amount,
        "remark": order_data.remark,
        "items_text": items_text,
        "status": "pending",
        "payment_screenshot": None,
        "payment_method": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.orders.insert_one(local_order)

    # Send order confirmation email
    if order_data.customer_email:
        try:
            subject, html, text = get_order_confirmation_email(local_order)
            send_email(order_data.customer_email, subject, html, text)
            logger.info(f"Order confirmation email sent to {order_data.customer_email}")
        except Exception as e:
            logger.error(f"Failed to send order confirmation email: {e}")

    return {
        "success": True,
        "order_id": order_id,
        "message": "Order created successfully"
    }

@api_router.get("/orders")
async def get_local_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

# ==================== PAYMENT METHODS ====================

class PaymentMethod(BaseModel):
    id: Optional[str] = None
    name: str
    image_url: str  # Logo/icon
    qr_code_url: Optional[str] = None  # QR code image
    merchant_name: Optional[str] = None
    phone_number: Optional[str] = None
    instructions: Optional[str] = None  # Payment instructions text
    is_active: bool = True
    sort_order: int = 0

@api_router.get("/payment-methods")
async def get_payment_methods():
    methods = await db.payment_methods.find({"is_active": True}).sort("sort_order", 1).to_list(100)
    for m in methods:
        m.pop("_id", None)
    return methods

@api_router.get("/payment-methods/all")
async def get_all_payment_methods(current_user: dict = Depends(get_current_user)):
    methods = await db.payment_methods.find().sort("sort_order", 1).to_list(100)
    for m in methods:
        m.pop("_id", None)
    return methods

@api_router.get("/payment-methods/{method_id}")
async def get_payment_method(method_id: str):
    method = await db.payment_methods.find_one({"id": method_id}, {"_id": 0})
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return method

@api_router.post("/payment-methods")
async def create_payment_method(method: PaymentMethod, current_user: dict = Depends(get_current_user)):
    method_dict = method.model_dump()
    method_dict["id"] = str(uuid.uuid4())
    await db.payment_methods.insert_one(method_dict)
    method_dict.pop("_id", None)
    return method_dict

@api_router.put("/payment-methods/{method_id}")
async def update_payment_method(method_id: str, method: PaymentMethod, current_user: dict = Depends(get_current_user)):
    method_dict = method.model_dump()
    method_dict["id"] = method_id
    await db.payment_methods.update_one({"id": method_id}, {"$set": method_dict})
    return method_dict

@api_router.delete("/payment-methods/{method_id}")
async def delete_payment_method(method_id: str, current_user: dict = Depends(get_current_user)):
    await db.payment_methods.delete_one({"id": method_id})
    return {"message": "Payment method deleted"}

# ==================== ORDER PAYMENT SCREENSHOT ====================

class PaymentScreenshotUpload(BaseModel):
    screenshot_url: str
    payment_method: Optional[str] = None

@api_router.post("/orders/{order_id}/payment-screenshot")
async def upload_payment_screenshot(order_id: str, data: PaymentScreenshotUpload):
    """Upload payment screenshot for an order"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_screenshot": data.screenshot_url,
            "payment_method": data.payment_method,
            "payment_uploaded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Payment screenshot uploaded", "order_id": order_id}

# ==================== NOTIFICATION BAR ====================

class NotificationBar(BaseModel):
    id: Optional[str] = None
    text: str
    link: Optional[str] = None
    is_active: bool = True
    bg_color: Optional[str] = "#F5A623"
    text_color: Optional[str] = "#000000"

@api_router.get("/notification-bar")
async def get_notification_bar():
    notification = await db.notification_bar.find_one({"is_active": True})
    if notification:
        notification.pop("_id", None)
    return notification

@api_router.put("/notification-bar")
async def update_notification_bar(notification: NotificationBar, current_user: dict = Depends(get_current_user)):
    notification_dict = notification.model_dump()
    notification_dict["id"] = "main"
    await db.notification_bar.update_one({"id": "main"}, {"$set": notification_dict}, upsert=True)
    return notification_dict

# ==================== BLOG POSTS ====================

class BlogPost(BaseModel):
    id: Optional[str] = None
    title: str
    slug: Optional[str] = None
    excerpt: str
    content: str
    image_url: Optional[str] = None
    is_published: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@api_router.get("/blog")
async def get_blog_posts():
    posts = await db.blog_posts.find({"is_published": True}).sort("created_at", -1).to_list(100)
    for p in posts:
        p.pop("_id", None)
    return posts

@api_router.get("/blog/all/admin")
async def get_all_blog_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.blog_posts.find().sort("created_at", -1).to_list(100)
    for p in posts:
        p.pop("_id", None)
    return posts

@api_router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    post.pop("_id", None)
    return post

@api_router.post("/blog")
async def create_blog_post(post: BlogPost, current_user: dict = Depends(get_current_user)):
    post_dict = post.model_dump()
    post_dict["id"] = str(uuid.uuid4())
    post_dict["slug"] = post_dict["slug"] or post_dict["title"].lower().replace(" ", "-").replace("?", "").replace("!", "")
    post_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    post_dict["updated_at"] = post_dict["created_at"]
    await db.blog_posts.insert_one(post_dict)
    post_dict.pop("_id", None)
    return post_dict

@api_router.put("/blog/{post_id}")
async def update_blog_post(post_id: str, post: BlogPost, current_user: dict = Depends(get_current_user)):
    post_dict = post.model_dump()
    post_dict["id"] = post_id
    post_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"id": post_id}, {"$set": post_dict})
    return post_dict

@api_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.blog_posts.delete_one({"id": post_id})
    return {"message": "Blog post deleted"}

# ==================== SITE SETTINGS ====================

@api_router.get("/settings")
async def get_site_settings():
    settings = await db.site_settings.find_one({"id": "main"})
    if not settings:
        settings = {
            "id": "main", 
            "notification_bar_enabled": True, 
            "chat_enabled": True,
            "service_charge": 0,
            "tax_percentage": 0,
            "tax_label": "Tax"
        }
    settings.pop("_id", None)
    return settings

@api_router.put("/settings")
async def update_site_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    settings["id"] = "main"
    await db.site_settings.update_one({"id": "main"}, {"$set": settings}, upsert=True)
    return settings

# ==================== PROMO CODES ====================

@api_router.get("/promo-codes")
async def get_promo_codes(current_user: dict = Depends(get_current_user)):
    codes = await db.promo_codes.find().sort("created_at", -1).to_list(100)
    for c in codes:
        c.pop("_id", None)
    return codes

@api_router.post("/promo-codes")
async def create_promo_code(code_data: PromoCodeCreate, current_user: dict = Depends(get_current_user)):
    # Check if code already exists
    existing = await db.promo_codes.find_one({"code": code_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    code = PromoCode(
        code=code_data.code.upper(),
        discount_type=code_data.discount_type,
        discount_value=code_data.discount_value,
        min_order_amount=code_data.min_order_amount,
        max_uses=code_data.max_uses,
        is_active=code_data.is_active
    )
    await db.promo_codes.insert_one(code.model_dump())
    result = code.model_dump()
    result.pop("_id", None)
    return result

@api_router.put("/promo-codes/{code_id}")
async def update_promo_code(code_id: str, code_data: PromoCodeCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.promo_codes.find_one({"id": code_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    update_data = code_data.model_dump()
    update_data["code"] = update_data["code"].upper()
    await db.promo_codes.update_one({"id": code_id}, {"$set": update_data})
    updated = await db.promo_codes.find_one({"id": code_id}, {"_id": 0})
    return updated

@api_router.delete("/promo-codes/{code_id}")
async def delete_promo_code(code_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.promo_codes.delete_one({"id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"message": "Promo code deleted"}

@api_router.post("/promo-codes/validate")
async def validate_promo_code(
    code: str, 
    subtotal: float, 
    cart_items: List[dict] = [], 
    customer_email: Optional[str] = None
):
    """Validate a promo code with advanced rules"""
    promo = await db.promo_codes.find_one({"code": code.upper(), "is_active": True})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    # Check expiry date
    if promo.get("expiry_date"):
        expiry = datetime.fromisoformat(promo["expiry_date"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(status_code=400, detail="Promo code has expired")
    
    # Check minimum order amount
    if promo.get("min_order_amount", 0) > subtotal:
        raise HTTPException(status_code=400, detail=f"Minimum order amount is Rs {promo['min_order_amount']}")
    
    # Check max uses
    if promo.get("max_uses") and promo.get("used_count", 0) >= promo["max_uses"]:
        raise HTTPException(status_code=400, detail="Promo code has reached maximum uses")
    
    # Check max uses per customer
    if customer_email and promo.get("max_uses_per_customer"):
        customer_usage = await db.promo_usage.count_documents({
            "promo_code": code.upper(),
            "customer_email": customer_email
        })
        if customer_usage >= promo["max_uses_per_customer"]:
            raise HTTPException(status_code=400, detail="You have already used this promo code")
    
    # Check first-time buyer restriction
    if promo.get("first_time_only") and customer_email:
        previous_orders = await db.orders.count_documents({"customer_email": customer_email})
        if previous_orders > 0:
            raise HTTPException(status_code=400, detail="This promo code is only for first-time buyers")
    
    # Check category/product restrictions
    if promo.get("applicable_categories") or promo.get("applicable_products"):
        cart_valid = False
        for item in cart_items:
            product_id = item.get("product_id")
            if product_id:
                product = await db.products.find_one({"id": product_id})
                if product:
                    # Check if product matches
                    if promo.get("applicable_products") and product_id in promo["applicable_products"]:
                        cart_valid = True
                        break
                    # Check if category matches
                    if promo.get("applicable_categories") and product.get("category_id") in promo["applicable_categories"]:
                        cart_valid = True
                        break
        
        if not cart_valid:
            raise HTTPException(status_code=400, detail="This promo code is not applicable to items in your cart")
    
    # Calculate discount
    discount = 0
    discount_details = {}
    
    if promo["discount_type"] == "percentage":
        discount = subtotal * (promo["discount_value"] / 100)
        discount_details = {
            "type": "percentage",
            "value": promo["discount_value"],
            "description": f"{promo['discount_value']}% off"
        }
    elif promo["discount_type"] == "fixed":
        discount = min(promo["discount_value"], subtotal)
        discount_details = {
            "type": "fixed",
            "value": promo["discount_value"],
            "description": f"Rs {promo['discount_value']} off"
        }
    elif promo["discount_type"] == "buy_x_get_y":
        buy_qty = promo.get("buy_quantity", 0)
        get_qty = promo.get("get_quantity", 0)
        discount_details = {
            "type": "buy_x_get_y",
            "buy_quantity": buy_qty,
            "get_quantity": get_qty,
            "description": f"Buy {buy_qty}, Get {get_qty} Free"
        }
    elif promo["discount_type"] == "free_shipping":
        discount_details = {
            "type": "free_shipping",
            "description": "Free Shipping"
        }
    
    return {
        "valid": True,
        "code": promo["code"],
        "discount_type": promo["discount_type"],
        "discount_value": promo["discount_value"],
        "discount_amount": round(discount, 2),
        "details": discount_details,
        "stackable": promo.get("stackable", False),
        "message": f"Promo code applied! {discount_details.get('description', '')}"
    }

@api_router.get("/promo-codes/auto-apply")
async def get_auto_apply_promos(subtotal: float, customer_email: Optional[str] = None):
    """Get all auto-apply promo codes that match the criteria"""
    query = {"is_active": True, "auto_apply": True}
    
    # Check expiry
    now = datetime.now(timezone.utc).isoformat()
    query["$or"] = [
        {"expiry_date": None},
        {"expiry_date": {"$gt": now}}
    ]
    
    promos = await db.promo_codes.find(query, {"_id": 0}).to_list(100)
    
    applicable_promos = []
    for promo in promos:
        try:
            # Validate each promo
            validation = await validate_promo_code(
                promo["code"], 
                subtotal, 
                [], 
                customer_email
            )
            applicable_promos.append({
                "code": promo["code"],
                "discount_amount": validation["discount_amount"],
                "description": validation["details"]["description"]
            })
        except:
            continue
    
    return applicable_promos

@api_router.post("/promo-codes/record-usage")
async def record_promo_usage(promo_code: str, order_id: str, customer_email: Optional[str] = None):
    """Record promo code usage"""
    # Increment usage count
    await db.promo_codes.update_one(
        {"code": promo_code.upper()},
        {"$inc": {"used_count": 1}}
    )
    
    # Record individual usage
    usage_record = {
        "id": str(uuid.uuid4()),
        "promo_code": promo_code.upper(),
        "order_id": order_id,
        "customer_email": customer_email,
        "used_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promo_usage.insert_one(usage_record)
    
    return {"message": "Promo usage recorded"}


# ==================== BUNDLE DEALS ====================

class BundleProduct(BaseModel):
    product_id: str
    variation_id: Optional[str] = None

class BundleCreate(BaseModel):
    name: str
    description: str = ""
    image_url: str = ""
    products: List[BundleProduct]
    original_price: float
    bundle_price: float
    is_active: bool = True
    sort_order: int = 0

class Bundle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = ""
    description: str = ""
    image_url: str = ""
    products: List[dict] = []
    original_price: float
    bundle_price: float
    discount_percentage: float = 0
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/bundles")
async def get_bundles():
    """Get all active bundles with populated product details"""
    bundles = await db.bundles.find({"is_active": True}).sort("sort_order", 1).to_list(100)
    
    # Populate product details for each bundle
    for bundle in bundles:
        bundle.pop("_id", None)
        populated_products = []
        for bp in bundle.get("products", []):
            product = await db.products.find_one({"id": bp.get("product_id")}, {"_id": 0})
            if product:
                populated_products.append({
                    "product": product,
                    "variation_id": bp.get("variation_id")
                })
        bundle["populated_products"] = populated_products
    
    return bundles

@api_router.get("/bundles/all")
async def get_all_bundles(current_user: dict = Depends(get_current_user)):
    """Get all bundles for admin"""
    bundles = await db.bundles.find().sort("sort_order", 1).to_list(100)
    for b in bundles:
        b.pop("_id", None)
    return bundles

@api_router.post("/bundles")
async def create_bundle(bundle_data: BundleCreate, current_user: dict = Depends(get_current_user)):
    slug = bundle_data.name.lower().replace(" ", "-").replace("&", "and")
    discount_pct = round(((bundle_data.original_price - bundle_data.bundle_price) / bundle_data.original_price) * 100, 1) if bundle_data.original_price > 0 else 0
    
    bundle = Bundle(
        name=bundle_data.name,
        slug=slug,
        description=bundle_data.description,
        image_url=bundle_data.image_url,
        products=[p.model_dump() for p in bundle_data.products],
        original_price=bundle_data.original_price,
        bundle_price=bundle_data.bundle_price,
        discount_percentage=discount_pct,
        is_active=bundle_data.is_active,
        sort_order=bundle_data.sort_order
    )
    
    await db.bundles.insert_one(bundle.model_dump())
    result = bundle.model_dump()
    return result

@api_router.put("/bundles/{bundle_id}")
async def update_bundle(bundle_id: str, bundle_data: BundleCreate, current_user: dict = Depends(get_current_user)):
    slug = bundle_data.name.lower().replace(" ", "-").replace("&", "and")
    discount_pct = round(((bundle_data.original_price - bundle_data.bundle_price) / bundle_data.original_price) * 100, 1) if bundle_data.original_price > 0 else 0
    
    update_data = {
        "name": bundle_data.name,
        "slug": slug,
        "description": bundle_data.description,
        "image_url": bundle_data.image_url,
        "products": [p.model_dump() for p in bundle_data.products],
        "original_price": bundle_data.original_price,
        "bundle_price": bundle_data.bundle_price,
        "discount_percentage": discount_pct,
        "is_active": bundle_data.is_active,
        "sort_order": bundle_data.sort_order
    }
    
    await db.bundles.update_one({"id": bundle_id}, {"$set": update_data})
    updated = await db.bundles.find_one({"id": bundle_id}, {"_id": 0})
    return updated

@api_router.delete("/bundles/{bundle_id}")
async def delete_bundle(bundle_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bundles.delete_one({"id": bundle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return {"message": "Bundle deleted"}

# ==================== RECENT PURCHASES (Live Ticker) ====================

import random

# Nepal cities for random location
NEPAL_CITIES = ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar", "Bharatpur", "Birgunj", "Dharan", "Butwal", "Hetauda", "Bhaktapur", "Janakpur", "Nepalgunj", "Itahari", "Dhangadhi", "Tulsipur"]

@api_router.get("/recent-purchases")
async def get_recent_purchases(limit: int = 10):
    """Get recent purchases for live ticker - mix of real orders and simulated"""
    purchases = []
    
    # Get real recent orders (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    real_orders = await db.orders.find(
        {"created_at": {"$gte": yesterday}},
        {"_id": 0, "customer_name": 1, "items_text": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for order in real_orders:
        # Mask customer name for privacy (show first name only)
        name_parts = order.get("customer_name", "Customer").split()
        masked_name = name_parts[0] if name_parts else "Customer"
        
        purchases.append({
            "name": masked_name,
            "location": random.choice(NEPAL_CITIES),
            "product": order.get("items_text", "Digital Product"),
            "time_ago": "Just now",
            "is_real": True
        })
    
    # If we don't have enough real orders, add simulated ones
    if len(purchases) < limit:
        # Get some products for simulation
        products = await db.products.find({"is_active": True}, {"_id": 0, "name": 1}).limit(20).to_list(20)
        product_names = [p["name"] for p in products] if products else ["Netflix Premium", "Spotify Premium", "YouTube Premium"]
        
        # Common Nepali first names
        names = ["Aarav", "Sita", "Ram", "Gita", "Bikash", "Anita", "Sunil", "Priya", "Rajesh", "Maya", "Dipak", "Sunita", "Anil", "Kamala", "Binod"]
        
        times_ago = ["2 min ago", "5 min ago", "8 min ago", "12 min ago", "15 min ago", "20 min ago", "25 min ago", "30 min ago"]
        
        while len(purchases) < limit:
            purchases.append({
                "name": random.choice(names),
                "location": random.choice(NEPAL_CITIES),
                "product": random.choice(product_names),
                "time_ago": random.choice(times_ago),
                "is_real": False
            })
    
    random.shuffle(purchases)
    return purchases[:limit]

# ==================== WISHLIST ====================

class WishlistItem(BaseModel):
    product_id: str
    variation_id: Optional[str] = None

class WishlistCreate(BaseModel):
    visitor_id: str  # Browser fingerprint or localStorage ID
    product_id: str
    variation_id: Optional[str] = None
    email: Optional[str] = None  # For price drop notifications

@api_router.get("/wishlist/{visitor_id}")
async def get_wishlist(visitor_id: str):
    """Get wishlist items for a visitor"""
    items = await db.wishlists.find({"visitor_id": visitor_id}, {"_id": 0}).to_list(100)
    
    # Populate product details
    for item in items:
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
        item["product"] = product
    
    return items

@api_router.post("/wishlist")
async def add_to_wishlist(data: WishlistCreate):
    """Add item to wishlist"""
    # Check if already in wishlist
    existing = await db.wishlists.find_one({
        "visitor_id": data.visitor_id,
        "product_id": data.product_id,
        "variation_id": data.variation_id
    })
    
    if existing:
        return {"message": "Already in wishlist", "id": existing.get("id")}
    
    # Get current price for tracking
    product = await db.products.find_one({"id": data.product_id})
    current_price = None
    if product and data.variation_id:
        for v in product.get("variations", []):
            if v.get("id") == data.variation_id:
                current_price = v.get("price")
                break
    elif product and product.get("variations"):
        current_price = product["variations"][0].get("price")
    
    wishlist_item = {
        "id": str(uuid.uuid4()),
        "visitor_id": data.visitor_id,
        "product_id": data.product_id,
        "variation_id": data.variation_id,
        "email": data.email,
        "price_when_added": current_price,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.wishlists.insert_one(wishlist_item)
    return {"message": "Added to wishlist", "id": wishlist_item["id"]}

@api_router.delete("/wishlist/{visitor_id}/{product_id}")
async def remove_from_wishlist(visitor_id: str, product_id: str, variation_id: Optional[str] = None):
    """Remove item from wishlist"""
    query = {"visitor_id": visitor_id, "product_id": product_id}
    if variation_id:
        query["variation_id"] = variation_id
    
    result = await db.wishlists.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    return {"message": "Removed from wishlist"}

@api_router.put("/wishlist/{visitor_id}/email")
async def update_wishlist_email(visitor_id: str, email: str):
    """Update email for price drop notifications"""
    await db.wishlists.update_many(
        {"visitor_id": visitor_id},
        {"$set": {"email": email}}
    )
    return {"message": "Email updated for notifications"}

# ==================== ORDER TRACKING ====================

class OrderStatusUpdate(BaseModel):
    status: str  # pending, processing, completed, cancelled
    note: Optional[str] = None

@api_router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    """Public order tracking by order ID or order number"""
    order = await db.orders.find_one(
        {"$or": [
            {"id": order_id}, 
            {"takeapp_order_id": order_id},
            {"takeapp_order_number": order_id}
        ]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get status history
    history = await db.order_status_history.find(
        {"order_id": order.get("id")},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    # Mask sensitive data for public view
    return {
        "id": order.get("id"),
        "order_number": order.get("takeapp_order_number"),
        "status": order.get("status", "pending"),
        "items_text": order.get("items_text"),
        "total_amount": order.get("total_amount"),
        "created_at": order.get("created_at"),
        "status_history": history,
        "estimated_delivery": "Instant delivery after payment confirmation"
    }

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Admin: Update order status"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_status = order.get("status", "pending")
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Add to status history
    history_entry = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "old_status": old_status,
        "new_status": status_data.status,
        "note": status_data.note,
        "updated_by": current_user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.order_status_history.insert_one(history_entry)
    
    # Send status update email
    if order.get("customer_email"):
        try:
            subject, html, text = get_order_status_update_email(order, status_data.status)
            send_email(order["customer_email"], subject, html, text)
            logger.info(f"Order status update email sent to {order['customer_email']}")
        except Exception as e:
            logger.error(f"Failed to send status update email: {e}")
    
    return {"message": f"Order status updated to {status_data.status}"}

@api_router.get("/orders/{order_id}")
async def get_order_details(order_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Get full order details"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    history = await db.order_status_history.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    order["status_history"] = history
    return order

# ==================== ANALYTICS DASHBOARD ====================

@api_router.get("/analytics/overview")
async def get_analytics_overview(current_user: dict = Depends(get_current_user)):
    """Get overview analytics for admin dashboard"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    
    # Today's stats
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today_start}})
    today_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": today_start}, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    today_revenue = today_revenue_cursor[0]["total"] if today_revenue_cursor else 0
    
    # This week stats
    week_orders = await db.orders.count_documents({"created_at": {"$gte": week_ago}})
    week_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": week_ago}, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    week_revenue = week_revenue_cursor[0]["total"] if week_revenue_cursor else 0
    
    # This month stats
    month_orders = await db.orders.count_documents({"created_at": {"$gte": month_ago}})
    month_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": month_ago}, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    month_revenue = month_revenue_cursor[0]["total"] if month_revenue_cursor else 0
    
    # All time stats
    total_orders = await db.orders.count_documents({})
    total_revenue_cursor = await db.orders.aggregate([
        {"$match": {"status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    total_revenue = total_revenue_cursor[0]["total"] if total_revenue_cursor else 0
    
    # Product & category counts
    total_products = await db.products.count_documents({"is_active": True})
    total_categories = await db.categories.count_documents({})
    total_reviews = await db.reviews.count_documents({})
    
    # Wishlist count
    total_wishlists = await db.wishlists.count_documents({})
    
    return {
        "today": {"orders": today_orders, "revenue": today_revenue},
        "week": {"orders": week_orders, "revenue": week_revenue},
        "month": {"orders": month_orders, "revenue": month_revenue},
        "all_time": {"orders": total_orders, "revenue": total_revenue},
        "counts": {
            "products": total_products,
            "categories": total_categories,
            "reviews": total_reviews,
            "wishlists": total_wishlists
        }
    }

@api_router.get("/analytics/top-products")
async def get_top_products(current_user: dict = Depends(get_current_user), limit: int = 10):
    """Get top selling products"""
    # Aggregate orders to find top products
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.name",
            "total_quantity": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"total_quantity": -1}},
        {"$limit": limit}
    ]
    
    top_products = await db.orders.aggregate(pipeline).to_list(limit)
    
    return [
        {
            "name": p["_id"],
            "quantity": p["total_quantity"],
            "revenue": p["total_revenue"]
        }
        for p in top_products
    ]

@api_router.get("/analytics/revenue-chart")
async def get_revenue_chart(current_user: dict = Depends(get_current_user), days: int = 30):
    """Get daily revenue for chart"""
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days)).isoformat()
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": {"$ne": "cancelled"}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.orders.aggregate(pipeline).to_list(days)
    
    # Fill in missing dates with zero values
    result = []
    current = now - timedelta(days=days)
    data_map = {d["_id"]: d for d in daily_data}
    
    for i in range(days + 1):
        date_str = current.strftime("%Y-%m-%d")
        if date_str in data_map:
            result.append({
                "date": date_str,
                "orders": data_map[date_str]["orders"],
                "revenue": data_map[date_str]["revenue"]
            })
        else:
            result.append({"date": date_str, "orders": 0, "revenue": 0})
        current += timedelta(days=1)
    
    return result

@api_router.get("/analytics/order-status")
async def get_order_status_breakdown(current_user: dict = Depends(get_current_user)):
    """Get order status breakdown"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    status_data = await db.orders.aggregate(pipeline).to_list(10)
    
    return {
        item["_id"] or "pending": item["count"]
        for item in status_data
    }

# ==================== SEO / SITEMAP ====================

from fastapi.responses import Response

@api_router.get("/sitemap.xml")
async def get_sitemap():
    """Generate dynamic sitemap for SEO"""
    base_url = os.environ.get("SITE_URL", "https://gameshopnepal.com")
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/faq", "priority": "0.6", "changefreq": "monthly"},
        {"loc": "/terms", "priority": "0.5", "changefreq": "monthly"},
        {"loc": "/blog", "priority": "0.8", "changefreq": "weekly"},
    ]
    
    # Get all active products
    products = await db.products.find({"is_active": True}, {"slug": 1}).to_list(1000)
    
    # Get all published blog posts
    blog_posts = await db.blog_posts.find({"is_published": True}, {"slug": 1}).to_list(100)
    
    # Get all categories
    categories = await db.categories.find({}, {"slug": 1}).to_list(100)
    
    # Build sitemap XML
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Add static pages
    for page in static_pages:
        xml_content += f'''  <url>
    <loc>{base_url}{page["loc"]}</loc>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>\n'''
    
    # Add products
    for product in products:
        if product.get("slug"):
            xml_content += f'''  <url>
    <loc>{base_url}/product/{product["slug"]}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n'''
    
    # Add blog posts
    for post in blog_posts:
        if post.get("slug"):
            xml_content += f'''  <url>
    <loc>{base_url}/blog/{post["slug"]}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>\n'''
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")

@api_router.get("/seo/meta/{page_type}/{slug}")
async def get_seo_meta(page_type: str, slug: str):
    """Get SEO meta data for a specific page"""
    if page_type == "product":
        product = await db.products.find_one({"slug": slug}, {"_id": 0})
        if product:
            # Get lowest price from variations
            min_price = min([v.get("price", 0) for v in product.get("variations", [])]) if product.get("variations") else 0
            
            return {
                "title": f"{product['name']} - Buy Online | GameShop Nepal",
                "description": f"Buy {product['name']} at the best price in Nepal. Starting from Rs {min_price}. Instant delivery, 100% genuine products.",
                "keywords": f"{product['name']}, buy {product['name']} Nepal, {product['name']} price Nepal, digital products Nepal",
                "og_image": product.get("image_url"),
                "schema": {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": product["name"],
                    "description": product.get("description", "")[:200].replace("<p>", "").replace("</p>", ""),
                    "image": product.get("image_url"),
                    "offers": {
                        "@type": "AggregateOffer",
                        "lowPrice": min_price,
                        "priceCurrency": "NPR",
                        "availability": "https://schema.org/InStock" if not product.get("is_sold_out") else "https://schema.org/OutOfStock"
                    }
                }
            }
    
    elif page_type == "blog":
        post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
        if post:
            return {
                "title": f"{post['title']} | GameShop Nepal Blog",
                "description": post.get("excerpt", post.get("content", "")[:160]),
                "keywords": f"{post['title']}, gaming blog Nepal, digital products guide",
                "og_image": post.get("image_url"),
                "schema": {
                    "@context": "https://schema.org",
                    "@type": "BlogPosting",
                    "headline": post["title"],
                    "description": post.get("excerpt", ""),
                    "image": post.get("image_url"),
                    "datePublished": post.get("created_at"),
                    "author": {"@type": "Organization", "name": "GameShop Nepal"}
                }
            }
    
    # Default meta
    return {
        "title": "GameShop Nepal - Digital Products at Best Prices",
        "description": "Buy Netflix, Spotify, YouTube Premium, PUBG UC and more at the best prices in Nepal. Instant delivery, 100% genuine products.",
        "keywords": "digital products Nepal, Netflix Nepal, Spotify Nepal, gaming topup Nepal"
    }

# ==================== CUSTOMER ACCOUNTS ====================

class CustomerLogin(BaseModel):
    phone: str
    otp: Optional[str] = None

class CustomerProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    
@api_router.post("/customers/login")
async def customer_login(data: CustomerLogin):
    """Login/Register customer by phone number - sends OTP or validates"""
    phone = data.phone.strip().replace(" ", "").replace("-", "")
    
    # Find or create customer
    customer = await db.customers.find_one({"phone": phone})
    
    if not data.otp:
        # Generate OTP (in production, send via SMS)
        import random
        otp = str(random.randint(100000, 999999))
        
        if customer:
            await db.customers.update_one({"phone": phone}, {"$set": {"otp": otp, "otp_expires": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}})
        else:
            await db.customers.insert_one({
                "id": str(uuid.uuid4()),
                "phone": phone,
                "name": None,
                "email": None,
                "otp": otp,
                "otp_expires": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "total_orders": 0,
                "total_spent": 0
            })
        
        # In production, send OTP via SMS. For now, return it (dev mode)
        return {"message": "OTP sent", "dev_otp": otp}  # Remove dev_otp in production
    
    else:
        # Validate OTP
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        if customer.get("otp") != data.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        if customer.get("otp_expires") and customer["otp_expires"] < datetime.now(timezone.utc).isoformat():
            raise HTTPException(status_code=400, detail="OTP expired")
        
        # Clear OTP and generate token
        await db.customers.update_one({"phone": phone}, {"$unset": {"otp": "", "otp_expires": ""}})
        
        token = jwt.encode(
            {"customer_id": customer["id"], "phone": phone, "exp": datetime.now(timezone.utc) + timedelta(days=30)},
            JWT_SECRET,
            algorithm="HS256"
        )
        
        return {
            "token": token,
            "customer": {
                "id": customer["id"],
                "phone": customer["phone"],
                "name": customer.get("name"),
                "email": customer.get("email")
            }
        }

async def get_current_customer(authorization: str = Header(None)):
    """Dependency to get current logged-in customer"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        customer = await db.customers.find_one({"id": payload["customer_id"]}, {"_id": 0, "otp": 0, "otp_expires": 0})
        if not customer:
            raise HTTPException(status_code=401, detail="Customer not found")
        return customer
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.get("/customers/me")
async def get_customer_profile(customer: dict = Depends(get_current_customer)):
    """Get current customer profile"""
    return customer

@api_router.put("/customers/me")
async def update_customer_profile(profile: CustomerProfile, customer: dict = Depends(get_current_customer)):
    """Update customer profile"""
    update_data = {}
    if profile.name is not None:
        update_data["name"] = profile.name
    if profile.email is not None:
        update_data["email"] = profile.email
    
    if update_data:
        await db.customers.update_one({"id": customer["id"]}, {"$set": update_data})
    
    updated = await db.customers.find_one({"id": customer["id"]}, {"_id": 0, "otp": 0, "otp_expires": 0})
    return updated

@api_router.get("/customers/me/orders")
async def get_customer_orders(customer: dict = Depends(get_current_customer)):
    """Get customer's order history"""
    # Find orders by phone number
    orders = await db.orders.find(
        {"customer_phone": customer["phone"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders

@api_router.post("/customers/sync-from-takeapp")
async def sync_customers_from_takeapp(current_user: dict = Depends(get_current_user)):
    """Admin: Sync customer data from Take.app orders"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TAKEAPP_BASE_URL}/orders?api_key={TAKEAPP_API_KEY}")
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch Take.app orders")
        
        orders = response.json()
        synced_count = 0
        
        for order in orders:
            phone = order.get("customer_phone") or order.get("phone")
            if not phone:
                continue
            
            phone = phone.strip().replace(" ", "").replace("-", "")
            
            # Find or create customer
            existing = await db.customers.find_one({"phone": phone})
            
            order_amount = float(order.get("total", 0) or 0)
            
            if existing:
                # Update stats
                await db.customers.update_one(
                    {"phone": phone},
                    {
                        "$inc": {"total_orders": 1, "total_spent": order_amount},
                        "$set": {
                            "name": order.get("customer_name") or existing.get("name"),
                            "email": order.get("customer_email") or existing.get("email"),
                            "last_order_at": order.get("created_at") or datetime.now(timezone.utc).isoformat()
                        }
                    }
                )
            else:
                # Create new customer
                await db.customers.insert_one({
                    "id": str(uuid.uuid4()),
                    "phone": phone,
                    "name": order.get("customer_name"),
                    "email": order.get("customer_email"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "total_orders": 1,
                    "total_spent": order_amount,
                    "last_order_at": order.get("created_at"),
                    "source": "takeapp"
                })
                synced_count += 1
        
        return {"message": f"Synced {synced_count} new customers from Take.app", "total_orders_processed": len(orders)}

@api_router.get("/customers")
async def get_all_customers(current_user: dict = Depends(get_current_user)):
    """Admin: Get all customers"""
    customers = await db.customers.find({}, {"_id": 0, "otp": 0, "otp_expires": 0}).sort("created_at", -1).to_list(1000)
    return customers

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "GameShop Nepal API"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
