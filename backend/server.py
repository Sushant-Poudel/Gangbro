from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
    is_active: bool = True
    is_sold_out: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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
    page_key: str  # about, contact, faq
    title: str
    content: str  # HTML content
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

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== FIXED ADMIN CREDENTIALS ====================
ADMIN_USERNAME = "gsnadmin"
ADMIN_PASSWORD = "gsnadmin"

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Registration disabled - only fixed admin account allowed
    raise HTTPException(status_code=403, detail="Registration disabled. Use admin credentials.")

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Check against fixed admin credentials
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

# ==================== CATEGORY ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(name: str, current_user: dict = Depends(get_current_user)):
    slug = name.lower().replace(" ", "-")
    category = Category(name=name, slug=slug)
    await db.categories.insert_one(category.model_dump())
    return category

# ==================== PRODUCT ROUTES ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(category_id: Optional[str] = None, active_only: bool = True):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if active_only:
        query["is_active"] = True
    
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    product = Product(**product_data.model_dump())
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

# ==================== PAGE ROUTES ====================

@api_router.get("/pages/{page_key}")
async def get_page(page_key: str):
    page = await db.pages.find_one({"page_key": page_key}, {"_id": 0})
    if not page:
        # Return default content
        defaults = {
            "about": {"title": "About Us", "content": "<p>Welcome to GameShop Nepal - Your trusted source for digital products since 2021.</p>"},
            "contact": {"title": "Contact Us", "content": "<p>Email: support@gameshopnepal.com</p>"},
            "faq": {"title": "FAQ", "content": "<p>Frequently asked questions will appear here.</p>"}
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

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    # Seed categories
    categories_data = [
        {"id": "gaming", "name": "Gaming", "slug": "gaming"},
        {"id": "ott", "name": "OTT Subscriptions", "slug": "ott-subscriptions"},
        {"id": "software", "name": "Software", "slug": "software"},
        {"id": "ai-tools", "name": "AI Tools", "slug": "ai-tools"},
        {"id": "topups", "name": "Top-ups", "slug": "top-ups"},
    ]
    
    for cat in categories_data:
        await db.categories.update_one({"id": cat["id"]}, {"$set": cat}, upsert=True)
    
    # Seed products
    products_data = [
        {
            "id": "capcut",
            "name": "Capcut Pro",
            "description": "<p><strong>Capcut Pro</strong> - Professional video editing app with premium features.</p><ul><li>All premium filters and effects</li><li>No watermark</li><li>Cloud storage</li><li>Priority support</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmj056qc5000404js081q0fus.jpeg",
            "category_id": "software",
            "variations": [
                {"id": "capcut-1m", "name": "1 Month", "price": 399, "original_price": 599},
                {"id": "capcut-3m", "name": "3 Months", "price": 999, "original_price": 1499},
                {"id": "capcut-1y", "name": "1 Year", "price": 1500, "original_price": 2999}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "canva-pro",
            "name": "Canva Pro",
            "description": "<p><strong>Canva Pro</strong> - Design anything with premium templates and features.</p><ul><li>100+ million premium stock photos</li><li>610,000+ premium templates</li><li>Background remover</li><li>Brand kit</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmkqjf5u9000104l88ttaexth.jpeg",
            "category_id": "software",
            "variations": [
                {"id": "canva-1m", "name": "1 Month", "price": 299, "original_price": 499},
                {"id": "canva-6m", "name": "6 Months", "price": 999, "original_price": 1999},
                {"id": "canva-1y", "name": "1 Year", "price": 1499, "original_price": 2999}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "gemini-pro",
            "name": "Gemini Pro",
            "description": "<p><strong>Google Gemini Pro</strong> - Advanced AI assistant with 2TB storage.</p><ul><li>Gemini Pro AI access</li><li>2TB Google Drive storage</li><li>Priority features</li><li>Advanced AI capabilities</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmkqjr227000204jja3lb0ofg.jpeg",
            "category_id": "ai-tools",
            "variations": [
                {"id": "gemini-1m", "name": "1 Month", "price": 999, "original_price": 1499},
                {"id": "gemini-3m", "name": "3 Months", "price": 2100, "original_price": 3499},
                {"id": "gemini-1y", "name": "1 Year", "price": 6999, "original_price": 12000}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "netflix",
            "name": "Netflix Premium",
            "description": "<p><strong>Netflix Premium</strong> - Stream unlimited movies and TV shows.</p><ul><li>4K Ultra HD streaming</li><li>Watch on 4 screens at once</li><li>Ad-free experience</li><li>Download on 6 devices</li></ul>",
            "image_url": "https://res.cloudinary.com/dh8gunpkd/image/upload/v1768366377/psu57vxfvdv1ivhjxz3b.png",
            "category_id": "ott",
            "variations": [
                {"id": "netflix-shared", "name": "Shared (1 Week)", "price": 99, "original_price": 149},
                {"id": "netflix-private", "name": "Private Profile (1 Month)", "price": 449, "original_price": 699},
                {"id": "netflix-3m", "name": "3 Months", "price": 1199, "original_price": 1799}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "pubg",
            "name": "PUBG UC",
            "description": "<p><strong>PUBG Mobile UC</strong> - Get Unknown Cash for PUBG Mobile.</p><ul><li>Instant delivery</li><li>Safe and secure</li><li>Works worldwide</li><li>24/7 support</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmgrso8xd000f04l1d0rt5jgv.png",
            "category_id": "topups",
            "variations": [
                {"id": "pubg-60", "name": "60 UC", "price": 140},
                {"id": "pubg-325", "name": "325 UC", "price": 560},
                {"id": "pubg-660", "name": "660 UC", "price": 1100},
                {"id": "pubg-1800", "name": "1800 UC", "price": 2800}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "valorant",
            "name": "Valorant Points",
            "description": "<p><strong>Valorant Points (VP)</strong> - Purchase skins and battle pass.</p><ul><li>Instant delivery</li><li>All regions supported</li><li>Safe transaction</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmhnfx7xw000f04kyaho6gfyc.jpeg",
            "category_id": "topups",
            "variations": [
                {"id": "vp-475", "name": "475 VP", "price": 560},
                {"id": "vp-1000", "name": "1000 VP", "price": 1100},
                {"id": "vp-2050", "name": "2050 VP", "price": 2100}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "steam-card",
            "name": "Steam Gift Card (USD)",
            "description": "<p><strong>Steam Wallet Gift Card</strong> - Add funds to your Steam account.</p><ul><li>Nepal region compatible</li><li>Instant code delivery</li><li>Works for all Steam games</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmgrrzngz000604l80j45ewkt.png",
            "category_id": "gaming",
            "variations": [
                {"id": "steam-5", "name": "$5 USD", "price": 750},
                {"id": "steam-10", "name": "$10 USD", "price": 1450},
                {"id": "steam-20", "name": "$20 USD", "price": 2850},
                {"id": "steam-50", "name": "$50 USD", "price": 7000}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "minecraft",
            "name": "Minecraft Java + Bedrock",
            "description": "<p><strong>Minecraft Java & Bedrock Edition</strong> - Get both editions in one purchase.</p><ul><li>Lifetime license</li><li>Both Java and Bedrock</li><li>Cross-platform play</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmgrrxtc4000j04jrgjwj1374.png",
            "category_id": "gaming",
            "variations": [
                {"id": "mc-full", "name": "Full License", "price": 1800, "original_price": 2500}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "adobe-cc",
            "name": "Adobe Creative Cloud - All Apps",
            "description": "<p><strong>Adobe Creative Cloud</strong> - All 20+ Adobe apps included.</p><ul><li>Photoshop, Illustrator, Premiere Pro</li><li>After Effects, InDesign, Lightroom</li><li>100GB cloud storage</li><li>Regular updates</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmhfsbc59000c04ky6e6x98gl.jpeg",
            "category_id": "software",
            "variations": [
                {"id": "adobe-1m", "name": "1 Month", "price": 1999, "original_price": 2999},
                {"id": "adobe-1y", "name": "1 Year", "price": 9999, "original_price": 14000}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "discord-nitro",
            "name": "Discord Nitro",
            "description": "<p><strong>Discord Nitro</strong> - Unlock premium Discord features.</p><ul><li>HD video streaming</li><li>Custom emojis everywhere</li><li>2 Server Boosts</li><li>Animated avatar</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmkqjtwrs000004jocqxodva8.jpeg",
            "category_id": "software",
            "variations": [
                {"id": "nitro-1m", "name": "1 Month", "price": 900, "original_price": 1499},
                {"id": "nitro-1y", "name": "1 Year", "price": 5999, "original_price": 9999}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "gta5",
            "name": "Grand Theft Auto 5",
            "description": "<p><strong>GTA 5</strong> - Experience the epic open world game.</p><ul><li>PC version (Steam/Rockstar)</li><li>Lifetime license</li><li>Online mode included</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmgrrp0zx001004jr98wkcrb7.jpeg",
            "category_id": "gaming",
            "variations": [
                {"id": "gta5-steam", "name": "Steam Version", "price": 2599, "original_price": 3499}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "pc-gamepass",
            "name": "PC Game Pass (Lifetime)",
            "description": "<p><strong>Xbox PC Game Pass</strong> - Access hundreds of PC games.</p><ul><li>Lifetime access</li><li>Day one releases</li><li>EA Play included</li><li>Cloud gaming</li></ul>",
            "image_url": "https://storage.googleapis.com/takeapp/media/cmgrrktqv000i04jv7907a4wc.jpeg",
            "category_id": "gaming",
            "variations": [
                {"id": "gamepass-lifetime", "name": "Lifetime Access", "price": 1799, "original_price": 2999}
            ],
            "is_active": True,
            "is_sold_out": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for prod in products_data:
        await db.products.update_one({"id": prod["id"]}, {"$set": prod}, upsert=True)
    
    # Seed reviews
    reviews_data = [
        {"id": "rev1", "reviewer_name": "Sujan Thapa", "rating": 5, "comment": "Fast delivery and genuine products. Got my Netflix subscription within minutes!", "review_date": "2025-01-10T10:00:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev2", "reviewer_name": "Anisha Sharma", "rating": 5, "comment": "Best prices in Nepal for digital products. Highly recommended!", "review_date": "2025-01-08T14:30:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev3", "reviewer_name": "Rohan KC", "rating": 5, "comment": "Bought PUBG UC, instant delivery. Will buy again!", "review_date": "2025-01-05T09:15:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev4", "reviewer_name": "Priya Pandey", "rating": 4, "comment": "Great service, customer support helped me set up my account.", "review_date": "2025-01-03T16:45:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev5", "reviewer_name": "Bikash Rai", "rating": 5, "comment": "Trusted seller! Been buying from them for 2 years now.", "review_date": "2024-12-28T11:20:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    for rev in reviews_data:
        await db.reviews.update_one({"id": rev["id"]}, {"$set": rev}, upsert=True)
    
    # Seed social links
    social_data = [
        {"id": "fb", "platform": "Facebook", "url": "https://facebook.com/gameshopnepal", "icon": "facebook"},
        {"id": "ig", "platform": "Instagram", "url": "https://instagram.com/gameshopnepal", "icon": "instagram"},
        {"id": "tt", "platform": "TikTok", "url": "https://tiktok.com/@gameshopnepal", "icon": "tiktok"},
        {"id": "wa", "platform": "WhatsApp", "url": "https://wa.me/9779743488871", "icon": "whatsapp"},
    ]
    
    for link in social_data:
        await db.social_links.update_one({"id": link["id"]}, {"$set": link}, upsert=True)
    
    return {"message": "Data seeded successfully"}

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
