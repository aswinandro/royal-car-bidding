-- Connect to the database manually before running this script
-- \c car_auction;

-- Insert sample cars
INSERT INTO "Car" (id, make, model, year, description, "imageUrl", "createdAt", "updatedAt") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Toyota', 'Camry', 2020, 'Well-maintained sedan with low mileage', 'https://example.com/camry.jpg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Honda', 'Civic', 2019, 'Reliable compact car, perfect for daily commuting', 'https://example.com/civic.jpg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'BMW', '3 Series', 2021, 'Luxury sedan with premium features', 'https://example.com/bmw.jpg', NOW(), NOW());

-- Insert sample users
INSERT INTO "User" (id, email, username, password, "createdAt", "updatedAt") VALUES
('550e8400-e29b-41d4-a716-446655440011', 'john@example.com', 'john_doe', '$2b$10$example_hashed_password', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440012', 'jane@example.com', 'jane_smith', '$2b$10$example_hashed_password', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440013', 'bob@example.com', 'bob_wilson', '$2b$10$example_hashed_password', NOW(), NOW());

-- Insert sample auctions
INSERT INTO "Auction" (id, "carId", "ownerId", "startTime", "endTime", "startingBid", "currentBid", "winnerId", status, "createdAt", "updatedAt") VALUES
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '23 hours', 15000, 16500, NULL, 'ACTIVE', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '25 hours', 12000, NULL, NULL, 'PENDING', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440013', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 25000, 28000, '550e8400-e29b-41d4-a716-446655440011', 'ENDED', NOW(), NOW());

-- Insert sample bids
INSERT INTO "Bid" (id, "userId", "auctionId", amount, "createdAt") VALUES
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440021', 15500, NOW() - INTERVAL '30 minutes'),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440021', 16000, NOW() - INTERVAL '15 minutes'),
('550e8400-e29b-41d4-a716-446655440033', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440021', 16500, NOW() - INTERVAL '5 minutes');
