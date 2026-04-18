/**
 * Analytics Routes
 * Dashboard metrics and sales analytics with date filtering.
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { success, error } = require('../utils/response');

// GET /api/analytics/dashboard - Today's summary cards
router.get('/dashboard', async (req, res) => {
  try {
    const data = await analyticsService.getDashboard();
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/analytics/revenue - Revenue & profit by day
router.get('/revenue', async (req, res) => {
  try {
    const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const data = await analyticsService.getRevenueByDay(from, to);
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/analytics/top-products - Top selling products
router.get('/top-products', async (req, res) => {
  try {
    const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const limit = parseInt(req.query.limit) || 10;
    const data = await analyticsService.getTopProducts(from, to, limit);
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/analytics/categories - Sales by category
router.get('/categories', async (req, res) => {
  try {
    const from = req.query.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);
    const data = await analyticsService.getSalesByCategory(from, to);
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
});

// GET /api/analytics/monthly - Monthly summary
router.get('/monthly', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const data = await analyticsService.getMonthlySummary(year);
    success(res, data);
  } catch (err) {
    error(res, err.message);
  }
});

module.exports = router;
