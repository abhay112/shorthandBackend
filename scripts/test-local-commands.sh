#!/bin/bash

# ================================================
# Commands to Test Locally and Fix Jest Hanging
# ================================================

echo "=========================================="
echo "  Local Testing Commands"
echo "=========================================="
echo ""

echo "1. Test with MongoDB (if you have MongoDB running locally):"
echo "   NODE_ENV=test TEST_MONGO_URI=mongodb://localhost:27017/test_shorthand npm test"
echo ""

echo "2. Test with --detectOpenHandles (to see what's keeping Jest alive):"
echo "   NODE_ENV=test npm test -- --detectOpenHandles"
echo ""

echo "3. Test with --forceExit (forces Jest to exit after tests):"
echo "   NODE_ENV=test npm test -- --forceExit"
echo ""

echo "4. Test with both (recommended for CI/CD):"
echo "   NODE_ENV=test npm test -- --passWithNoTests --forceExit"
echo ""

echo "5. Run specific test file:"
echo "   NODE_ENV=test npm test -- tests/unit/controllers/StudentController.test.js"
echo ""

echo "=========================================="
echo "  Quick Test (Run this now)"
echo "=========================================="
echo ""
echo "Running: NODE_ENV=test npm test -- --passWithNoTests --forceExit"
echo ""

NODE_ENV=test npm test -- --passWithNoTests --forceExit

