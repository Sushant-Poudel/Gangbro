from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Body, Request
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

class ProductVariation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    original_price: Optional[float] = None
    description: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    image_url: str
    category_id: str
    variations: List[ProductVariation] = []
    tags: List[str] = []  # NEW: Tags like "popular", "sale", "new", "limited"
    sort_order: int = 0   # NEW: For ordering products
    is_active: bool = True
    is_sold_out: bool = False

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    image_url: str
    category_id: str
    variations: List[ProductVariation] = []
    tags: List[str] = []
    sort_order: int = 0
    is_active: bool = True
    is_sold_out: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductOrderUpdate(BaseModel):
    product_ids: List[str]  # Ordered list of product IDs

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

# NEW: FAQ Item Model
class FAQItemCreate(BaseModel):
    question: str
    answer: str
    sort_order: int = 0

class FAQItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: str
    sort_order: int = 0

class FAQReorderRequest(BaseModel):
    faq_ids: List[str]

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
    
    # Sort by sort_order ascending, then by created_at descending
    products = await db.products.find(query, {"_id": 0}).sort([("sort_order", 1), ("created_at", -1)]).to_list(1000)
    return products

# IMPORTANT: Static routes must come BEFORE parameterized routes
@api_router.put("/products/reorder")
async def reorder_products(order_data: ProductOrderUpdate, current_user: dict = Depends(get_current_user)):
    for index, product_id in enumerate(order_data.product_ids):
        await db.products.update_one({"id": product_id}, {"$set": {"sort_order": index}})
    return {"message": "Products reordered successfully"}

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    # Get max sort_order and add 1
    max_order = await db.products.find_one(sort=[("sort_order", -1)])
    next_order = (max_order.get("sort_order", 0) + 1) if max_order else 0
    
    product_dict = product_data.model_dump()
    product_dict["sort_order"] = next_order
    product = Product(**product_dict)
    await db.products.insert_one(product.model_dump())
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump()
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

# ==================== FAQ ROUTES ====================

@api_router.get("/faqs", response_model=List[FAQItem])
async def get_faqs():
    faqs = await db.faqs.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return faqs

@api_router.post("/faqs", response_model=FAQItem)
async def create_faq(faq_data: FAQItemCreate, current_user: dict = Depends(get_current_user)):
    # Get max sort_order
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
    # Seed social links
    social_data = [
        {"id": "fb", "platform": "Facebook", "url": "https://facebook.com/gameshopnepal", "icon": "facebook"},
        {"id": "ig", "platform": "Instagram", "url": "https://instagram.com/gameshopnepal", "icon": "instagram"},
        {"id": "tt", "platform": "TikTok", "url": "https://tiktok.com/@gameshopnepal", "icon": "tiktok"},
        {"id": "wa", "platform": "WhatsApp", "url": "https://wa.me/9779743488871", "icon": "whatsapp"},
    ]
    
    for link in social_data:
        await db.social_links.update_one({"id": link["id"]}, {"$set": link}, upsert=True)
    
    # Seed reviews
    reviews_data = [
        {"id": "rev1", "reviewer_name": "Sujan Thapa", "rating": 5, "comment": "Fast delivery and genuine products. Got my Netflix subscription within minutes!", "review_date": "2025-01-10T10:00:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev2", "reviewer_name": "Anisha Sharma", "rating": 5, "comment": "Best prices in Nepal for digital products. Highly recommended!", "review_date": "2025-01-08T14:30:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev3", "reviewer_name": "Rohan KC", "rating": 5, "comment": "Bought PUBG UC, instant delivery. Will buy again!", "review_date": "2025-01-05T09:15:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    for rev in reviews_data:
        await db.reviews.update_one({"id": rev["id"]}, {"$set": rev}, upsert=True)
    
    # Seed default FAQs
    default_faqs = [
        {"id": "faq1", "question": "How do I place an order?", "answer": "Simply browse our products, select the plan you want, and click 'Order Now'. This will redirect you to WhatsApp where you can complete your order.", "sort_order": 0},
        {"id": "faq2", "question": "How long does delivery take?", "answer": "Most products are delivered instantly within minutes after payment confirmation.", "sort_order": 1},
        {"id": "faq3", "question": "What payment methods do you accept?", "answer": "We accept eSewa, Khalti, bank transfer, and other local payment methods.", "sort_order": 2},
        {"id": "faq4", "question": "Are your products genuine?", "answer": "Yes! All our products are 100% genuine and sourced directly from authorized channels.", "sort_order": 3},
    ]
    
    for faq in default_faqs:
        await db.faqs.update_one({"id": faq["id"]}, {"$set": faq}, upsert=True)
    
    return {"message": "Data seeded successfully"}

# ==================== TAKE.APP INTEGRATION ====================

TAKEAPP_API_KEY = os.environ.get("TAKEAPP_API_KEY", "")
TAKEAPP_BASE_URL = "https://take.app/api/platform"

class TakeAppOrder(BaseModel):
    id: str
    number: int
    status: str
    paymentStatus: str
    fulfillmentStatus: str
    customerName: str
    customerPhone: str
    customerEmail: Optional[str] = None
    totalAmount: int
    totalItemsQuantity: int
    items: List[dict] = []
    createdAt: str
    updatedAt: str

class TakeAppInventoryItem(BaseModel):
    item_id: str
    item_name: str
    quantity: int
    price: int
    original_price: Optional[int] = None

class TakeAppSyncResult(BaseModel):
    synced_count: int
    message: str

@api_router.get("/takeapp/store")
async def get_takeapp_store(current_user: dict = Depends(get_current_user)):
    """Get Take.app store information"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TAKEAPP_BASE_URL}/me?api_key={TAKEAPP_API_KEY}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch store info")
        return response.json()

@api_router.get("/takeapp/orders")
async def get_takeapp_orders(current_user: dict = Depends(get_current_user)):
    """Get orders from Take.app"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TAKEAPP_BASE_URL}/orders?api_key={TAKEAPP_API_KEY}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch orders")
        
        orders = response.json()
        # Store orders in local DB for tracking
        for order in orders:
            await db.takeapp_orders.update_one(
                {"id": order["id"]},
                {"$set": order},
                upsert=True
            )
        return orders

@api_router.get("/takeapp/inventory")
async def get_takeapp_inventory(current_user: dict = Depends(get_current_user)):
    """Get inventory from Take.app"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TAKEAPP_BASE_URL}/inventory?api_key={TAKEAPP_API_KEY}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch inventory")
        return response.json()

@api_router.put("/takeapp/inventory/{item_id}")
async def update_takeapp_inventory(item_id: str, quantity: int = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    """Update inventory quantity on Take.app"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{TAKEAPP_BASE_URL}/inventory/{item_id}?api_key={TAKEAPP_API_KEY}",
            json={"quantity": quantity}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to update inventory")
        return {"message": "Inventory updated", "item_id": item_id, "quantity": quantity}

# Order creation models
class OrderItem(BaseModel):
    name: str
    price: int  # in paisa (1 rupee = 100 paisa)
    quantity: int = 1
    variation: Optional[str] = None

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    items: List[OrderItem]
    total_amount: int  # in paisa
    remark: Optional[str] = None

@api_router.post("/orders/create")
async def create_order(order_data: CreateOrderRequest):
    """Create an order - saves locally and syncs to Take.app"""
    
    # Generate order ID
    order_id = str(uuid.uuid4())
    
    # Build remark with item details
    items_text = ", ".join([f"{item.quantity}x {item.name}" + (f" ({item.variation})" if item.variation else "") for item in order_data.items])
    full_remark = f"Items: {items_text}"
    if order_data.remark:
        full_remark += f"\nNote: {order_data.remark}"
    
    # Save order locally first
    local_order = {
        "id": order_id,
        "customer_name": order_data.customer_name,
        "customer_phone": order_data.customer_phone,
        "customer_email": order_data.customer_email,
        "items": [item.model_dump() for item in order_data.items],
        "total_amount": order_data.total_amount,
        "remark": order_data.remark,
        "status": "pending",
        "takeapp_synced": False,
        "takeapp_order_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(local_order)
    
    # Try to sync to Take.app
    takeapp_result = None
    if TAKEAPP_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                takeapp_payload = {
                    "customer_name": order_data.customer_name,
                    "customer_phone": order_data.customer_phone,
                    "customer_email": order_data.customer_email,
                    "total_amount": order_data.total_amount,  # in paisa
                    "remark": full_remark
                }
                
                response = await client.post(
                    f"{TAKEAPP_BASE_URL}/orders?api_key={TAKEAPP_API_KEY}",
                    json=takeapp_payload,
                    timeout=10.0
                )
                
                if response.status_code in [200, 201]:
                    takeapp_result = response.json()
                    # Update local order with Take.app order ID
                    await db.orders.update_one(
                        {"id": order_id},
                        {"$set": {
                            "takeapp_synced": True,
                            "takeapp_order_id": takeapp_result.get("id"),
                            "takeapp_order_number": takeapp_result.get("number")
                        }}
                    )
        except Exception as e:
            print(f"Failed to sync order to Take.app: {e}")
    
    # Get updated order
    final_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    return {
        "success": True,
        "order_id": order_id,
        "takeapp_synced": final_order.get("takeapp_synced", False),
        "takeapp_order_number": final_order.get("takeapp_order_number"),
        "message": "Order created successfully"
    }

@api_router.get("/orders")
async def get_local_orders(current_user: dict = Depends(get_current_user)):
    """Get all local orders"""
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.post("/takeapp/sync-products")
async def sync_takeapp_products(current_user: dict = Depends(get_current_user)):
    """Sync products from Take.app inventory to local database"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TAKEAPP_BASE_URL}/inventory?api_key={TAKEAPP_API_KEY}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch inventory")
        
        inventory = response.json()
        synced = 0
        
        for item in inventory:
            # Check if product already exists by Take.app ID
            existing = await db.products.find_one({"takeapp_id": item["item_id"]})
            
            if not existing:
                # Create new product from Take.app item
                # Get existing category or create a default one
                default_cat = await db.categories.find_one({"slug": "takeapp-imports"})
                if not default_cat:
                    default_cat = {
                        "id": str(uuid.uuid4()),
                        "name": "Take.app Imports",
                        "slug": "takeapp-imports",
                        "image_url": ""
                    }
                    await db.categories.insert_one(default_cat)
                
                # Get max sort_order
                max_order = await db.products.find_one(sort=[("sort_order", -1)])
                next_order = (max_order.get("sort_order", 0) + 1) if max_order else 0
                
                new_product = {
                    "id": str(uuid.uuid4()),
                    "takeapp_id": item["item_id"],
                    "name": item["item_name"],
                    "slug": item["item_name"].lower().replace(" ", "-"),
                    "description": f"<p>Imported from Take.app</p>",
                    "image_url": "",
                    "category_id": default_cat["id"],
                    "variations": [{
                        "id": f"var-{uuid.uuid4()}",
                        "name": "Default",
                        "price": item["price"] / 100,  # Convert from paisa to rupees
                        "original_price": item.get("original_price", item["price"]) / 100 if item.get("original_price") else None
                    }],
                    "tags": ["Take.app"],
                    "sort_order": next_order,
                    "is_active": True,
                    "is_sold_out": item["quantity"] == 0,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.products.insert_one(new_product)
                synced += 1
            else:
                # Update existing product's sold out status based on inventory
                await db.products.update_one(
                    {"takeapp_id": item["item_id"]},
                    {"$set": {"is_sold_out": item["quantity"] == 0}}
                )
        
        return {"synced_count": synced, "message": f"Synced {synced} new products from Take.app"}

@api_router.get("/takeapp/orders/stats")
async def get_takeapp_order_stats(current_user: dict = Depends(get_current_user)):
    """Get order statistics from Take.app"""
    if not TAKEAPP_API_KEY:
        raise HTTPException(status_code=400, detail="Take.app API key not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TAKEAPP_BASE_URL}/orders?api_key={TAKEAPP_API_KEY}")
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch orders")
        
        orders = response.json()
        
        # Calculate statistics
        total_orders = len(orders)
        pending_orders = len([o for o in orders if o["status"] == "ORDER_STATUS_PENDING"])
        completed_orders = len([o for o in orders if o["status"] == "ORDER_STATUS_COMPLETED"])
        cancelled_orders = len([o for o in orders if o["status"] == "ORDER_STATUS_CANCELLED"])
        
        total_revenue = sum(o["totalAmount"] for o in orders if o["status"] == "ORDER_STATUS_COMPLETED") / 100
        
        # Get orders from last 24 hours
        now = datetime.now(timezone.utc)
        recent_orders = [o for o in orders if datetime.fromisoformat(o["createdAt"].replace("Z", "+00:00")) > now - timedelta(hours=24)]
        
        return {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "completed_orders": completed_orders,
            "cancelled_orders": cancelled_orders,
            "total_revenue": total_revenue,
            "orders_last_24h": len(recent_orders)
        }

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
