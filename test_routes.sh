#!/bin/bash

echo "🧪 Testing Backend Routes..."
echo "================================"

BASE_URL="http://localhost:5001"

echo "1. Testing Health Endpoint:"
curl -s "$BASE_URL/health" | jq '.' 2>/dev/null || curl -s "$BASE_URL/health"
echo -e "\n"

echo "2. Testing Assets Endpoint:"
curl -s "$BASE_URL/api/assets" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/assets"
echo -e "\n"

echo "3. Testing Next Update Endpoint:"
curl -s "$BASE_URL/api/next-update" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/next-update"
echo -e "\n"

echo "4. Testing Auth Register (POST):"
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password","confirmPassword":"password"}' \
  | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password","confirmPassword":"password"}'
echo -e "\n"

echo "5. Testing Auth Login (POST):"
curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq '.' 2>/dev/null || curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
echo -e "\n"

echo "6. Testing Portfolio Endpoint (GET with dummy userId):"
curl -s "$BASE_URL/api/portfolio/507f1f77bcf86cd799439011" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/portfolio/507f1f77bcf86cd799439011"
echo -e "\n"

echo "7. Testing Manual Portfolio Update:"
curl -s "$BASE_URL/api/update-all-portfolios" | jq '.' 2>/dev/null || curl -s "$BASE_URL/api/update-all-portfolios"
echo -e "\n"

echo "================================"
echo "✅ Route testing completed!"
