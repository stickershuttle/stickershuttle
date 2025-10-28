-- Create page_seo table for managing SEO metadata across all pages
CREATE TABLE IF NOT EXISTS page_seo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_path VARCHAR(255) NOT NULL UNIQUE,
    page_name VARCHAR(255) NOT NULL,
    
    -- Meta tags
    title VARCHAR(255),
    description TEXT,
    keywords TEXT,
    robots VARCHAR(50) DEFAULT 'index, follow',
    
    -- Open Graph
    og_title VARCHAR(255),
    og_description TEXT,
    og_image TEXT,
    og_type VARCHAR(50) DEFAULT 'website',
    og_url TEXT,
    
    -- Twitter
    twitter_card VARCHAR(50) DEFAULT 'summary_large_image',
    twitter_title VARCHAR(255),
    twitter_description TEXT,
    twitter_image TEXT,
    
    -- Canonical URL
    canonical_url TEXT,
    
    -- Structured data (stored as JSON)
    structured_data JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    CONSTRAINT page_path_format CHECK (page_path ~ '^[a-zA-Z0-9/-]+$')
);

-- Create index on page_path for fast lookups
CREATE INDEX IF NOT EXISTS idx_page_seo_path ON page_seo(page_path);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_page_seo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_seo_updated_at
    BEFORE UPDATE ON page_seo
    FOR EACH ROW
    EXECUTE FUNCTION update_page_seo_updated_at();

-- Insert default entries for major pages
INSERT INTO page_seo (page_path, page_name, title, description, og_image) VALUES
    ('/', 'Home', 'Sticker Shuttle - Premium Custom Stickers & Vinyl Banners', 'Custom stickers, vinyl banners, and decals with fast shipping.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products', 'Products', 'Products - Sticker Shuttle', 'Browse our complete selection of custom stickers, vinyl banners, and promotional products.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/vinyl-stickers', 'Vinyl Stickers', 'Vinyl Stickers - Sticker Shuttle', 'Premium vinyl stickers with weather-resistant materials.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/holographic-stickers', 'Holographic Stickers', 'Holographic Stickers - Sticker Shuttle', 'Eye-catching holographic stickers that shine and shimmer.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/clear-stickers', 'Clear Stickers', 'Clear Stickers - Sticker Shuttle', 'Crystal clear stickers with professional printing.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/glitter-stickers', 'Glitter Stickers', 'Glitter Stickers - Sticker Shuttle', 'Sparkling glitter stickers that add shine and style.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/chrome-stickers', 'Chrome Stickers', 'Chrome Stickers - Sticker Shuttle', 'Metallic chrome stickers with a mirror-like finish.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/sticker-sheets', 'Sticker Sheets', 'Sticker Sheets - Sticker Shuttle', 'Full sticker sheets perfect for bulk orders.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/sample-packs', 'Sample Packs', 'Sample Packs - Sticker Shuttle', 'Try before you buy! Sample packs featuring our most popular materials.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/products/vinyl-banners', 'Vinyl Banners', 'Vinyl Banners - Sticker Shuttle', 'Large format vinyl banners for events and displays.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/pro', 'Pro Membership', 'Sticker Shuttle Pro - Never Run Out of Stickers', 'Automatic monthly sticker delivery for businesses.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/pro/circle', 'Pro Circle', 'Pro Circle - Connect with Fellow Businesses', 'Join our exclusive network of Pro members.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/pro/circle/add-my-business', 'Add My Business', 'Add My Business to Pro Circle', 'Submit your business to join the Pro Circle network.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/pro/join', 'Join Pro', 'Join Pro Membership', 'Start your Pro membership today.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/contact-us', 'Contact Us', 'Contact Us - Sticker Shuttle', 'Get in touch with our team for custom orders and support.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/blog', 'Blog', 'Blog - Sticker Shuttle', 'Latest tips, guides, and insights about custom stickers and branding.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/marketspace', 'Marketspace', 'Marketspace - Creator Marketplace', 'Shop unique sticker designs from independent creators.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/creators-space-apply', 'Creators Space Apply', 'Apply to Sell on Creators Space', 'Join our marketplace and start selling your designs.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/bannership', 'Bannership', 'Bannership - Custom Banners', 'Custom vinyl banners for events and promotional displays.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/bannership/products', 'Bannership Products', 'Bannership Products - Custom Banners', 'Browse our selection of custom vinyl banners.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/bannership/products/vinyl-banners', 'Bannership Vinyl Banners', 'Vinyl Banners - Bannership', 'Large format vinyl banners with weather-resistant materials.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/bannership/products/x-banners', 'X-Banners', 'X-Banners - Bannership', 'Retractable X-banner displays for trade shows.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/bannership/products/pop-up-banners', 'Pop-Up Banners', 'Pop-Up Banners - Bannership', 'Pop-up banner displays for quick setup.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/waitlist', 'Waitlist', 'Join the Waitlist', 'Be the first to know about new products and offers.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/store-credit', 'Store Credit', 'Store Credit - Sticker Shuttle', 'Manage your store credit balance and rewards.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/shipping-process', 'Shipping Process', 'How We Ship Your Orders', 'Learn about our shipping and packaging process.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/returns', 'Returns', 'Returns Policy', 'Our returns and refund policy.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/privacy-policy', 'Privacy Policy', 'Privacy Policy - Sticker Shuttle', 'Read how we protect your personal information.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/terms-and-conditions', 'Terms and Conditions', 'Terms - Sticker Shuttle', 'Read our terms and conditions.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png'),
    ('/cookie-policy', 'Cookie Policy', 'Cookie Policy - Sticker Shuttle', 'Learn how we use cookies.', 'https://res.cloudinary.com/dxcnvqk6b/image/upload/v1752101226/StickerShuttle_Homepage_Share_fpoirg.png')
ON CONFLICT (page_path) DO NOTHING;

