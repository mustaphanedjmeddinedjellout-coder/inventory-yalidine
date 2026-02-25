/**
 * Calculation Utilities
 * Centralized business logic for revenue, profit, and order calculations.
 */

/**
 * Calculate line item totals
 * @param {number} quantity - Number of items
 * @param {number} sellingPrice - Price per item at time of sale
 * @param {number} costPrice - Cost per item at time of sale
 * @returns {Object} { lineTotal, lineCost, lineProfit }
 */
function calculateLineItem(quantity, sellingPrice, costPrice) {
  const lineTotal = round(quantity * sellingPrice);
  const lineCost = round(quantity * costPrice);
  const lineProfit = round(lineTotal - lineCost);
  return { lineTotal, lineCost, lineProfit };
}

/**
 * Calculate order totals from line items
 * @param {Array} items - Array of { lineTotal, lineCost, lineProfit }
 * @returns {Object} { totalAmount, totalCost, totalProfit, itemsCount }
 */
function calculateOrderTotals(items) {
  const totalAmount = round(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const totalCost = round(items.reduce((sum, item) => sum + item.lineCost, 0));
  const totalProfit = round(totalAmount - totalCost);
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { totalAmount, totalCost, totalProfit, itemsCount };
}

/**
 * Round to 2 decimal places to avoid floating point issues
 */
function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Generate a unique order number: ORD-YYYYMMDD-XXXX
 */
function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${date}-${random}`;
}

module.exports = {
  calculateLineItem,
  calculateOrderTotals,
  round,
  generateOrderNumber,
};
