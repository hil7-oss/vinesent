from pydantic import BaseModel, Field
from typing import Optional, Literal, List

class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    parentId: Optional[str] = None
    order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    parentId: Optional[str] = None
    order: Optional[int] = None

class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    parentId: Optional[str] = None
    order: int = 0
    productCount: int = 0
    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    price: float = Field(ge=0)
    salePrice: Optional[float] = None
    cost: Optional[float] = None
    images: str
    stock: int = 0
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    categoryId: Optional[str] = None
    categoryIds: List[str] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    salePrice: Optional[float] = None
    cost: Optional[float] = None
    images: Optional[str] = None
    stock: Optional[int] = None
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    categoryId: Optional[str] = None
    categoryIds: Optional[List[str]] = None

class ProductOut(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    salePrice: Optional[float] = None
    cost: float = 0.0
    images: str
    stock: int
    isArchived: bool = False
    seoTitle: Optional[str] = None
    seoDescription: Optional[str] = None
    categoryId: Optional[str] = None
    categories: List[CategoryOut] = []
    measurements: Optional[dict] = None
    class Config:
        from_attributes = True

class VariantOut(BaseModel):
    id: str
    productId: str
    size: Optional[str] = None
    color: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    price: Optional[float] = None
    salePrice: Optional[float] = None
    cost: Optional[float] = None
    stock: int = 0
    images: Optional[str] = None
    class Config:
        from_attributes = True

class Banner(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = None
    image: str
    link: str
    position: Optional[str] = None
    active: Optional[bool] = None
    text: Optional[str] = None
    bgColor: Optional[str] = None
    textColor: Optional[str] = None
    buttonText: Optional[str] = None
    buttonLink: Optional[str] = None
    buttonBgColor: Optional[str] = None
    buttonTextColor: Optional[str] = None
    showTimer: Optional[bool] = None
    timerEndsAt: Optional[str] = None
    showAnimation: Optional[bool] = None

class PromoBanner(BaseModel):
    id: str
    text: str = ""
    bgColor: Optional[str] = None
    textColor: Optional[str] = None
    buttonText: Optional[str] = None
    buttonLink: Optional[str] = None
    buttonBgColor: Optional[str] = None
    buttonTextColor: Optional[str] = None
    showTimer: Optional[bool] = None
    timerEndsAt: Optional[str] = None
    showAnimation: Optional[bool] = None
    active: Optional[bool] = None

class Collection(BaseModel):
    id: str
    key: str
    title: str
    description: Optional[str] = None
    image: Optional[str] = None
    productIds: List[str] = []

class NavItem(BaseModel):
    id: str
    label: str
    href: str
    group: Literal["MAIN", "BOY", "GIRL"]
    order: Optional[int] = None

class ContentData(BaseModel):
    banners: List[Banner] = []
    promoBanners: List[PromoBanner] = []
    collections: List[Collection] = []
    navigation: List[NavItem] = []
    updatedAt: str

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[str] = None
    link: Optional[str] = None
    position: Optional[str] = None
    active: Optional[bool] = None

class CollectionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    productIds: Optional[List[str]] = None

class RecommendationRes(BaseModel):
    similar: List[ProductOut] = []
    set: List[ProductOut] = []
    alsoLike: List[ProductOut] = []
