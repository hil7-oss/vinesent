from sqlalchemy import Column, String, Integer, ForeignKey, Numeric, Text, Table
from sqlalchemy.orm import relationship, synonym
from .database import Base

# Prisma implicit many-to-many table for categories
category_product_link = Table(
    "_ProductCategories",
    Base.metadata,
    Column("A", String, ForeignKey("Category.id"), primary_key=True),
    Column("B", String, ForeignKey("Product.id"), primary_key=True),
)

# Symmetrical related products many-to-many
related_products_link = Table(
    "_RelatedProducts",
    Base.metadata,
    Column("A", String, ForeignKey("Product.id"), primary_key=True),
    Column("B", String, ForeignKey("Product.id"), primary_key=True),
)

class Category(Base):
    __tablename__ = "Category"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image = Column(String, nullable=True)
    parentId = Column(String, ForeignKey("Category.id"), nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    parent = relationship("Category", remote_side=[id], backref="children")
    products = relationship("Product", secondary=category_product_link, back_populates="categories")
    legacy_products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "Product"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    price = Column(Numeric, nullable=False)
    salePrice = Column(Numeric, nullable=True)
    cost = Column(Numeric, default=0)
    images = Column(Text, nullable=False)
    stock = Column(Integer, default=0)
    seoTitle = Column(String, nullable=True)
    seoDescription = Column(Text, nullable=True)
    gender = Column(String, nullable=True)
    categoryId = Column(String, ForeignKey("Category.id"), nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    category = relationship("Category", back_populates="legacy_products")
    categories = relationship("Category", secondary=category_product_link, back_populates="products")
    variants = relationship("ProductVariant", back_populates="product")
    related_products = relationship(
        "Product",
        secondary=related_products_link,
        primaryjoin="Product.id == _RelatedProducts.c.A",
        secondaryjoin="Product.id == _RelatedProducts.c.B",
        backref="related_to"
    )

class ProductVariant(Base):
    __tablename__ = "ProductVariant"
    id = Column(String, primary_key=True, index=True)
    productId = Column(String, ForeignKey("Product.id"), nullable=False)
    size = Column(String, nullable=True)
    color = Column(String, nullable=True)
    sku = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    price = Column(Numeric, nullable=True)
    salePrice = Column(Numeric, nullable=True)
    cost = Column(Numeric, default=0)
    stock = Column(Integer, default=0)
    images = Column(Text, nullable=True)
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)

    product = relationship("Product", back_populates="variants")

class User(Base):
    __tablename__ = "User"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    passwordHash = synonym("password")
    name = Column(String, nullable=True)
    firstName = Column(String, nullable=True)
    lastName = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="USER")
    createdAt = Column(String, nullable=True)
    updatedAt = Column(String, nullable=True)
